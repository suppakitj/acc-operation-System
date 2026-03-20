import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Browse Google Drive folders/files created by the LINE auto-save system.
 * Supports: list root "LINE Files" folder, navigate into subfolders, get download links.
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, folder_id, file_id } = await req.json();

  let accessToken;
  try {
    const conn = await base44.asServiceRole.connectors.getConnection('googledrive');
    accessToken = conn.accessToken;
  } catch (e) {
    return Response.json({ error: 'Google Drive not connected' }, { status: 400 });
  }

  const authHeader = { Authorization: `Bearer ${accessToken}` };

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
      // Fallback: find folder named "LINE Files"
      const rootQuery = `name='LINE Files' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const rootRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(rootQuery)}&fields=files(id,name)`,
        { headers: authHeader }
      );
      if (!rootRes.ok) {
        return Response.json({ error: 'Failed to search Drive' }, { status: 500 });
      }
      const rootData = await rootRes.json();
      if (!rootData.files || rootData.files.length === 0) {
        return Response.json({ files: [], breadcrumb: [{ id: null, name: rootName }] });
      }
      rootId = rootData.files[0].id;
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

    query = `'${rootId}' in parents and trashed=false`;

    // List root folder contents
    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,modifiedTime,iconLink,thumbnailLink)&orderBy=name&pageSize=100`,
      { headers: authHeader }
    );
    if (!listRes.ok) {
      const errText = await listRes.text();
      return Response.json({ error: 'Failed to list files', details: errText }, { status: 500 });
    }
    const listData = await listRes.json();

    return Response.json({
      files: (listData.files || []).map(f => ({
        id: f.id,
        name: f.name,
        isFolder: f.mimeType === 'application/vnd.google-apps.folder',
        mimeType: f.mimeType,
        size: f.size ? parseInt(f.size) : null,
        modifiedTime: f.modifiedTime,
        thumbnailLink: f.thumbnailLink,
      })),
      current_folder_id: rootId,
      root_name: rootName,
      breadcrumb: [{ id: rootId, name: rootName }],
    });
  }

  // List folder contents
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,modifiedTime,iconLink,thumbnailLink)&orderBy=name&pageSize=100`,
    { headers: authHeader }
  );
  if (!listRes.ok) {
    const errText = await listRes.text();
    return Response.json({ error: 'Failed to list files', details: errText }, { status: 500 });
  }
  const listData = await listRes.json();

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
    files: (listData.files || []).map(f => ({
      id: f.id,
      name: f.name,
      isFolder: f.mimeType === 'application/vnd.google-apps.folder',
      mimeType: f.mimeType,
      size: f.size ? parseInt(f.size) : null,
      modifiedTime: f.modifiedTime,
      thumbnailLink: f.thumbnailLink,
    })),
    current_folder_id: folder_id,
    current_folder_name: folderName,
    parent_id: parentId,
  });
});