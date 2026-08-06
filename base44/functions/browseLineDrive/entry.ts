import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Browse Google Drive folders/files created by the LINE auto-save system.
 * Supports: list root "LINE Files" folder, navigate into subfolders, get download links.
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, folder_id, file_id, all_folder_ids } = await req.json();

  let accessToken;
  try {
    const conn = await base44.asServiceRole.connectors.getConnection('googledrive');
    accessToken = conn.accessToken;
  } catch (e) {
    return Response.json({ error: 'Google Drive not connected' }, { status: 400 });
  }

  const authHeader = { Authorization: `Bearer ${accessToken}` };

  // Helper: list files from a folder, with pagination support
  async function listFolderContents(folderId, fields = 'files(id,name,mimeType,size,modifiedTime,iconLink,thumbnailLink)') {
    const q = `'${folderId}' in parents and trashed=false`;
    let allFiles = [];
    let pageToken = null;
    do {
      const url = new URL('https://www.googleapis.com/drive/v3/files');
      url.searchParams.set('q', q);
      url.searchParams.set('fields', `nextPageToken,${fields}`);
      url.searchParams.set('orderBy', 'name');
      url.searchParams.set('pageSize', '200');
      url.searchParams.set('spaces', 'drive');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const res = await fetch(url.toString(), { headers: authHeader });
      if (!res.ok) break;
      const data = await res.json();
      allFiles = allFiles.concat(data.files || []);
      pageToken = data.nextPageToken || null;
    } while (pageToken);
    return allFiles;
  }

  // Helper: find ALL sibling folders with the same name under the same parent
  async function findSiblingFolderIds(folderId) {
    // Get this folder's name and parent
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,parents`,
      { headers: authHeader }
    );
    if (!metaRes.ok) return [folderId];
    const meta = await metaRes.json();
    const parentId = meta.parents?.[0];
    if (!parentId) return [folderId];

    // Search for all folders with same name under same parent
    const escapedName = meta.name.replace(/'/g, "\\'");
    const q = `name='${escapedName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`,
      { headers: authHeader }
    );
    if (!searchRes.ok) return [folderId];
    const data = await searchRes.json();
    return (data.files || []).map(f => f.id);
  }

  // Helper: merge children from multiple folder IDs, dedup folders by name (keep newest)
  async function listMergedContents(folderIds) {
    const allRaw = [];
    for (const fid of folderIds) {
      const items = await listFolderContents(fid);
      allRaw.push(...items);
    }
    // For folders with same name, keep the one with latest modifiedTime and track all IDs
    const folderGroups = {};
    const fileItems = [];
    for (const f of allRaw) {
      if (f.mimeType === 'application/vnd.google-apps.folder') {
        if (!folderGroups[f.name]) {
          folderGroups[f.name] = { best: f, allIds: [f.id] };
        } else {
          folderGroups[f.name].allIds.push(f.id);
          if (f.modifiedTime > folderGroups[f.name].best.modifiedTime) {
            folderGroups[f.name].best = f;
          }
        }
      } else {
        fileItems.push(f);
      }
    }
    // Deduplicate files by name (same name = keep newest)
    const fileMap = {};
    for (const f of fileItems) {
      if (!fileMap[f.name] || f.modifiedTime > fileMap[f.name].modifiedTime) {
        fileMap[f.name] = f;
      }
    }
    const mergedFolders = Object.values(folderGroups).map(g => ({
      ...g.best,
      _allIds: g.allIds, // used by frontend if needed
    }));
    return [...mergedFolders, ...Object.values(fileMap)];
  }

  function mapFile(f) {
    return {
      id: f.id,
      name: f.name,
      isFolder: f.mimeType === 'application/vnd.google-apps.folder',
      mimeType: f.mimeType,
      size: f.size ? parseInt(f.size) : null,
      modifiedTime: f.modifiedTime,
      thumbnailLink: f.thumbnailLink,
      _allIds: f._allIds || undefined,
    };
  }

  // Action: download — get a temporary download link
  if (action === 'download' && file_id) {
    // Get file metadata to check if it's downloadable
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file_id}?fields=id,name,mimeType,webContentLink,webViewLink`,
      { headers: authHeader }
    );
    if (!metaRes.ok) {
      return Response.json({ error: 'File not found' }, { status: 404 });
    }
    const meta = await metaRes.json();

    // For Google Drive files, webContentLink is the direct download link
    // For non-Google files, we can use alt=media
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file_id}?alt=media`;

    // Fetch the file and return as base64 (for small files) or provide download info
    return Response.json({
      id: meta.id,
      name: meta.name,
      mimeType: meta.mimeType,
      webViewLink: meta.webViewLink,
      webContentLink: meta.webContentLink,
      downloadUrl,
      accessToken, // Frontend will use this temporarily for download
    });
  }

  // Action: list — browse folder contents
  let query;
  if (folder_id) {
    // List contents of specific folder
    query = `'${folder_id}' in parents and trashed=false`;
  } else {
    // Check if a custom root folder is configured in AppConfig
    const configs = await base44.asServiceRole.entities.AppConfig.filter({});
    const configuredRootId = configs.find(c => c.key === 'gdrive_line_files_root_id')?.value || '';

    let rootId = configuredRootId;
    let rootName = 'LINE Files';

    if (!rootId) {
      // Fallback: find ALL folders named "LINE Files" (may have duplicates from race condition)
      const rootQuery = `name='LINE Files' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const rootRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(rootQuery)}&fields=files(id,name,createdTime)&orderBy=createdTime&spaces=drive`,
        { headers: authHeader }
      );
      if (!rootRes.ok) {
        return Response.json({ error: 'Failed to search Drive' }, { status: 500 });
      }
      const rootData = await rootRes.json();
      if (!rootData.files || rootData.files.length === 0) {
        return Response.json({ files: [], breadcrumb: [{ id: null, name: rootName }] });
      }
      // Use the earliest-created as canonical but merge from ALL
      const allRootIds = rootData.files.map(f => f.id);
      rootId = allRootIds[0]; // earliest created

      if (allRootIds.length > 1) {
        console.log(`Found ${allRootIds.length} "LINE Files" root folders — merging contents`);
        const mergedFiles = await listMergedContents(allRootIds);
        return Response.json({
          files: mergedFiles.map(mapFile),
          current_folder_id: rootId,
          root_name: rootName,
          breadcrumb: [{ id: rootId, name: rootName }],
        });
      }
    } else {
      // Get the configured folder's name
      const folderMetaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${rootId}?fields=id,name`,
        { headers: authHeader }
      );
      if (folderMetaRes.ok) {
        const folderMeta = await folderMetaRes.json();
        rootName = folderMeta.name || 'LINE Files';
      }
    }

    // List root folder contents (no merging needed at root level)
    const rootFiles = await listFolderContents(rootId);
    // Dedup folders by name at root level too
    const rootFolderGroups = {};
    const rootFileItems = [];
    for (const f of rootFiles) {
      if (f.mimeType === 'application/vnd.google-apps.folder') {
        if (!rootFolderGroups[f.name]) {
          rootFolderGroups[f.name] = { best: f, allIds: [f.id] };
        } else {
          rootFolderGroups[f.name].allIds.push(f.id);
          if (f.modifiedTime > rootFolderGroups[f.name].best.modifiedTime) {
            rootFolderGroups[f.name].best = f;
          }
        }
      } else {
        rootFileItems.push(f);
      }
    }
    const mergedRoot = [
      ...Object.values(rootFolderGroups).map(g => ({ ...g.best, _allIds: g.allIds })),
      ...rootFileItems,
    ];

    return Response.json({
      files: mergedRoot.map(mapFile),
      current_folder_id: rootId,
      root_name: rootName,
      breadcrumb: [{ id: rootId, name: rootName }],
    });
  }

  // Subfolder: use all_folder_ids if provided (from frontend merge), else find siblings
  const folderIdsToMerge = (all_folder_ids && all_folder_ids.length > 0)
    ? all_folder_ids
    : await findSiblingFolderIds(folder_id);
  const mergedFiles = await listMergedContents(folderIdsToMerge);

  // Get folder name for breadcrumb
  const folderMetaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folder_id}?fields=id,name,parents`,
    { headers: authHeader }
  );
  let folderName = folder_id;
  let parentId = null;
  if (folderMetaRes.ok) {
    const folderMeta = await folderMetaRes.json();
    folderName = folderMeta.name;
    parentId = folderMeta.parents ? folderMeta.parents[0] : null;
  }

  return Response.json({
    files: mergedFiles.map(mapFile),
    current_folder_id: folder_id,
    current_folder_name: folderName,
    parent_id: parentId,
  });
});