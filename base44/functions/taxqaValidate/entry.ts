import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { filing_id, is_revalidation } = await req.json();
    if (!filing_id) return Response.json({ error: 'filing_id required' }, { status: 400 });

    const svc = base44.asServiceRole;

    // ─── Load filing ───
    const filings = await svc.entities.TaxQA_Filing.filter({ id: filing_id });
    const filing = filings[0];
    if (!filing) return Response.json({ error: 'Filing not found' }, { status: 404 });

    // ─── Load config from DB ───
    const [globalRules, keywordMaps, whtRates, lineItems] = await Promise.all([
      svc.entities.TaxQA_ValidationRule.filter({ rule_code: 'GLOBAL_PARAMS' }),
      svc.entities.TaxQA_IncomeKeywordMap.filter({}, 'keyword', 200),
      svc.entities.TaxQA_WhtRateTable.filter({ active: true }, 'income_type', 200),
      svc.entities.TaxQA_LineItem.filter({ filing_id }, 'seq_in_file', 2000),
    ]);

    const params = globalRules[0]?.parameters || { amount_tolerance: 1, juristic_tax_id_prefix: '0', input_vat_carryforward_months: 6 };
    const tolerance = params.amount_tolerance || 1;
    const juristicPrefix = params.juristic_tax_id_prefix || '0';

    // ─── If re-validation, clear old open flags first ───
    if (is_revalidation) {
      const oldFlags = await svc.entities.TaxQA_ExceptionFlag.filter({ filing_id }, '-created_date', 500);
      for (const f of oldFlags) {
        if (f.status === 'open') {
          await svc.entities.TaxQA_ExceptionFlag.delete(f.id);
        }
      }
    }

    const flags = [];
    const addFlag = (rule_code, severity, message, line_item_id) => {
      flags.push({ filing_id, rule_code, severity, message, line_item_id: line_item_id || null, status: 'open' });
    };

    const formType = filing.form_type;
    const isWht = ['PND1', 'PND3', 'PND53', 'PND54'].includes(formType);
    const isVat = formType === 'PP30';

    // ═══════════════════════════════════════════════════
    // STRUCTURAL (all forms)
    // ═══════════════════════════════════════════════════

    // 1. Tax ID checksum (mod-11) — for WHT payee_tax_id, for VAT counterparty_tax_id
    const checkTaxId = (taxId) => {
      if (!taxId || taxId.length !== 13) return false;
      const digits = taxId.replace(/\D/g, '');
      if (digits.length !== 13) return false;
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += parseInt(digits[i]) * (13 - i);
      }
      const check = (11 - (sum % 11)) % 10;
      return check === parseInt(digits[12]);
    };

    for (const li of lineItems) {
      const taxId = isWht ? li.payee_tax_id : li.counterparty_tax_id;
      if (taxId && taxId.replace(/\D/g, '').length === 13 && !checkTaxId(taxId)) {
        addFlag('TAX_ID_CHECKSUM', 'error', `เลขผู้เสียภาษี "${taxId}" ไม่ผ่าน checksum (mod-11) — ตรวจสอบความถูกต้อง`, li.id);
      }
    }

    // 2. WHT: tax_base × wht_rate ≈ wht_amount
    if (isWht) {
      for (const li of lineItems) {
        if (li.tax_base && li.wht_rate != null) {
          const expected = Math.round(li.tax_base * li.wht_rate) / 100;
          const diff = Math.abs(expected - (li.wht_amount || 0));
          if (diff > tolerance) {
            addFlag('WHT_CALC_MISMATCH', 'error',
              `บรรทัด #${li.seq_in_file}: tax_base(${li.tax_base}) × rate(${li.wht_rate}%) = ${expected.toFixed(2)} แต่ wht_amount = ${li.wht_amount} (ต่าง ${diff.toFixed(2)})`, li.id);
          }
        }
      }
    }

    // 3. WHT total check: sum(wht_amount) vs header_total_tax
    if (isWht && filing.header_total_tax != null) {
      const sumWht = lineItems.reduce((s, li) => s + (li.wht_amount || 0), 0);
      const roundedSum = Math.round(sumWht * 100) / 100;
      const diff = Math.abs(roundedSum - filing.header_total_tax);
      if (diff > tolerance) {
        addFlag('WHT_TOTAL_MISMATCH', 'error',
          `ผลรวม wht_amount (${roundedSum.toFixed(2)}) ไม่ตรงกับ header_total_tax (${filing.header_total_tax}) — ต่าง ${diff.toFixed(2)}`);
      }
    }

    // 4. Deadline proximity check
    if (filing.tax_deadline_id) {
      const deadlines = await svc.entities.TaxDeadline.filter({ id: filing.tax_deadline_id });
      if (deadlines[0]) {
        const dl = new Date(deadlines[0].deadline);
        const today = new Date();
        const daysLeft = Math.ceil((dl - today) / 86400000);
        if (daysLeft < 0) {
          addFlag('DEADLINE_PAST', 'warning', `กำหนดยื่น ${deadlines[0].deadline} เลยมาแล้ว ${Math.abs(daysLeft)} วัน`);
        } else if (daysLeft <= 3) {
          addFlag('DEADLINE_NEAR', 'warning', `กำหนดยื่น ${deadlines[0].deadline} เหลืออีก ${daysLeft} วัน`);
        }
      }
    }

    // ═══════════════════════════════════════════════════
    // RATE checks (PND3/PND53)
    // ═══════════════════════════════════════════════════
    if (formType === 'PND3' || formType === 'PND53') {
      for (const li of lineItems) {
        const desc = (li.income_desc || '').toLowerCase();

        // Rate check via keyword map
        let matched = false;
        for (const km of keywordMaps) {
          if (desc.includes(km.keyword.toLowerCase())) {
            matched = true;
            if (Math.abs(li.wht_rate - km.expected_rate) > 0.001) {
              addFlag('RATE_MISMATCH', 'error',
                `บรรทัด #${li.seq_in_file} "${li.income_desc}": อัตรา ${li.wht_rate}% ไม่ตรงกับมาตรฐาน ${km.expected_rate}% (keyword "${km.keyword}")`, li.id);
            }
            break;
          }
        }
        if (!matched && desc.trim()) {
          addFlag('RATE_UNKNOWN_INCOME', 'warning',
            `บรรทัด #${li.seq_in_file} "${li.income_desc}": ระบุประเภทเงินได้ไม่ได้จาก keyword — ตรวจมือ`, li.id);
        }

        // Payee type vs form type
        const payeeTaxId = (li.payee_tax_id || '').replace(/\D/g, '');
        if (payeeTaxId.length === 13) {
          const firstDigit = payeeTaxId[0];
          const isJuristic = firstDigit === juristicPrefix;
          if (isJuristic && formType === 'PND3') {
            addFlag('PAYEE_WRONG_FORM', 'error',
              `บรรทัด #${li.seq_in_file} ผู้รับ "${li.payee_name}" เลขทะเบียน "${li.payee_tax_id}" ขึ้นต้น 0 (นิติบุคคล) ควรอยู่ ภงด.53 ไม่ใช่ ภงด.3`, li.id);
          }
          if (!isJuristic && formType === 'PND53') {
            addFlag('PAYEE_WRONG_FORM', 'error',
              `บรรทัด #${li.seq_in_file} ผู้รับ "${li.payee_name}" เลขทะเบียน "${li.payee_tax_id}" ขึ้นต้น ${firstDigit} (บุคคลธรรมดา) ควรอยู่ ภงด.3 ไม่ใช่ ภงด.53`, li.id);
          }
        }
      }
    }

    // ═══════════════════════════════════════════════════
    // PND54 — DTA warning
    // ═══════════════════════════════════════════════════
    if (formType === 'PND54') {
      const dtaRates = whtRates.filter(r => r.is_dta_adjustable);
      for (const li of lineItems) {
        const hasDta = dtaRates.some(r => Math.abs(r.rate - li.wht_rate) < 0.001);
        if (hasDta) {
          addFlag('PND54_DTA_CHECK', 'warning',
            `บรรทัด #${li.seq_in_file}: อัตรา ${li.wht_rate}% อาจปรับตาม DTA รายประเทศ — ตรวจมือ`, li.id);
        }
      }
    }

    // ═══════════════════════════════════════════════════
    // PND1 — structural only + warning
    // ═══════════════════════════════════════════════════
    if (formType === 'PND1') {
      addFlag('PND1_PROGRESSIVE_SKIP', 'warning',
        'PND1: progressive PIT recalc ต้องใช้ข้อมูลเงินเดือนสะสม นอกขอบเขต v1 — ตรวจมือ');
    }

    // ═══════════════════════════════════════════════════
    // CROSS-FORM: PND54 ↔ PP36
    // ═══════════════════════════════════════════════════
    if (formType === 'PND54') {
      const pp36 = await svc.entities.TaxQA_Filing.filter({
        customer_id: filing.customer_id, tax_period: filing.tax_period, form_type: 'PP36'
      });
      if (pp36.length === 0) {
        addFlag('CROSS_PND54_PP36', 'error',
          `มี ภงด.54 งวด ${filing.tax_period} แต่ยังไม่มี ภ.พ.36 — ต้องยื่นคู่กัน`);
      }
    }
    if (formType === 'PP36') {
      const pnd54 = await svc.entities.TaxQA_Filing.filter({
        customer_id: filing.customer_id, tax_period: filing.tax_period, form_type: 'PND54'
      });
      if (pnd54.length === 0) {
        addFlag('CROSS_PP36_PND54', 'error',
          `มี ภ.พ.36 งวด ${filing.tax_period} แต่ยังไม่มี ภงด.54 — ต้องยื่นคู่กัน`);
      }
    }

    // ═══════════════════════════════════════════════════
    // PP30 — RECONCILIATION + CONTINUITY
    // ═══════════════════════════════════════════════════
    if (isVat) {
      // Gather ALL PP30 line items for this customer+period (across all filings/batches)
      const allPp30Filings = await svc.entities.TaxQA_Filing.filter({
        customer_id: filing.customer_id, tax_period: filing.tax_period, form_type: 'PP30'
      });
      const allFilingIds = allPp30Filings.map(f => f.id);

      let allLines = [];
      for (const fid of allFilingIds) {
        const lines = await svc.entities.TaxQA_LineItem.filter({ filing_id: fid }, 'seq_in_file', 2000);
        allLines = allLines.concat(lines);
      }

      const outputVat = allLines.filter(l => l.vat_direction === 'output').reduce((s, l) => s + (l.vat_amount || 0), 0);
      const inputVat = allLines.filter(l => l.vat_direction === 'input').reduce((s, l) => s + (l.vat_amount || 0), 0);

      // CONTINUITY: check credit_brought_forward against previous period
      const [year, month] = filing.tax_period.split('-').map(Number);
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const prevPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

      const prevRegisters = await svc.entities.TaxQA_VatPeriodRegister.filter({
        customer_id: filing.customer_id, tax_period: prevPeriod
      }, '-version', 1);

      let creditBf = 0;
      if (prevRegisters.length > 0) {
        creditBf = prevRegisters[0].credit_carried_forward || 0;
      }

      // Calculate net
      const netCalc = outputVat - inputVat - creditBf;
      const netPayable = netCalc > 0 ? Math.round(netCalc * 100) / 100 : 0;
      const creditCf = netCalc < 0 ? Math.round(Math.abs(netCalc) * 100) / 100 : 0;

      // Store computed values on filing (for display, not yet committed as register)
      // We just validate here

      // RECONCILIATION: check output_vat and input_vat are non-negative
      if (outputVat < 0) {
        addFlag('PP30_OUTPUT_NEGATIVE', 'error', `ภาษีขายรวม (${outputVat.toFixed(2)}) เป็นค่าลบ — ตรวจสอบรายการ`);
      }
      if (inputVat < 0) {
        addFlag('PP30_INPUT_NEGATIVE', 'error', `ภาษีซื้อรวม (${inputVat.toFixed(2)}) เป็นค่าลบ — ตรวจสอบรายการ`);
      }

      // CONTINUITY: credit b/f matching
      if (prevRegisters.length > 0) {
        // Check that our credit_brought_forward (from line items or filing) = prev credit_carried_forward
        // For now we just validate the chain
        if (creditBf > 0) {
          addFlag('PP30_CREDIT_BF_INFO', 'warning',
            `เครดิตภาษียกมาจากงวด ${prevPeriod} = ${creditBf.toFixed(2)} บาท — ตรวจรอยต่อ`);
        }
      } else {
        addFlag('PP30_FIRST_PERIOD', 'warning',
          `ไม่พบ register งวดก่อน (${prevPeriod}) — ถือเป็นงวดแรก credit_brought_forward = 0`);
      }

      // INPUT VAT carryforward: check purchase lines with tax_invoice_date before tax_period
      const carryMonths = params.input_vat_carryforward_months || 6;
      const periodStart = new Date(year, month - 1, 1);

      for (const li of allLines) {
        if (li.vat_direction !== 'input' || !li.tax_invoice_date) continue;

        // Parse Thai or standard date
        let invoiceDate = null;
        const dateStr = String(li.tax_invoice_date).trim();
        // Try parsing common formats
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const d = parseInt(parts[0]);
          const m = parseInt(parts[1]);
          let y = parseInt(parts[2]);
          if (y > 2500) y -= 543; // Thai Buddhist year
          invoiceDate = new Date(y, m - 1, d);
        }

        if (invoiceDate && invoiceDate < periodStart) {
          const monthsBack = (periodStart.getFullYear() - invoiceDate.getFullYear()) * 12 + (periodStart.getMonth() - invoiceDate.getMonth());
          if (monthsBack > carryMonths) {
            addFlag('PP30_INPUT_CARRYFORWARD_EXCEED', 'error',
              `บรรทัดใบกำกับ "${li.tax_invoice_no}" วันที่ ${li.tax_invoice_date} เกิน ${carryMonths} เดือน จากงวด ${filing.tax_period} — ห้ามนำมาหักภาษีซื้อ`, li.id);
          }
        }
      }

      // Store summary on filing for reference
      await svc.entities.TaxQA_Filing.update(filing_id, {
        header_total_tax: Math.round((outputVat - inputVat) * 100) / 100,
      });
    }

    // ═══════════════════════════════════════════════════
    // PERSIST FLAGS + UPDATE FILING STATUS
    // ═══════════════════════════════════════════════════
    const BATCH_SZ = 10;
    for (let i = 0; i < flags.length; i += BATCH_SZ) {
      const batch = flags.slice(i, i + BATCH_SZ);
      await svc.entities.TaxQA_ExceptionFlag.bulkCreate(batch);
      if (i + BATCH_SZ < flags.length) await new Promise(r => setTimeout(r, 500));
    }

    // Update filing status + flag_count
    const hasFlags = flags.length > 0;
    await svc.entities.TaxQA_Filing.update(filing_id, {
      status: hasFlags ? 'flagged' : 'clean',
      flag_count: flags.length,
    });

    return Response.json({
      success: true,
      filing_id,
      status: hasFlags ? 'flagged' : 'clean',
      total_flags: flags.length,
      errors: flags.filter(f => f.severity === 'error').length,
      warnings: flags.filter(f => f.severity === 'warning').length,
      flags: flags.map(f => ({ rule_code: f.rule_code, severity: f.severity, message: f.message })),
    });
  } catch (error) {
    console.error('taxqaValidate error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});