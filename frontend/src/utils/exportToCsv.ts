export function exportToCsv<T>(
  data: T[],
  columns: { header: string; accessorKey?: string }[],
  filename: string = 'export'
) {
  if (!data || !data.length) return;

  const validColumns = columns.filter(c => c.header && c.accessorKey && c.accessorKey !== 'actions');

  const headers = validColumns.map(c => `"${c.header}"`).join(',');

  const rows = data.map(row => {
    return validColumns.map(col => {
      if (!col.accessorKey) return '""';
      
      const keys = col.accessorKey.split('.');
      let val: any = row;
      for (const key of keys) {
        if (val == null) break;
        val = val[key];
      }
      
      if (val === null || val === undefined) {
        val = '';
      }
      
      if (typeof val === 'string') {
        val = val.replace(/"/g, '""');
        return `"${val}"`;
      }
      return val;
    }).join(',');
  });

  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if ((navigator as any).msSaveBlob) {
    (navigator as any).msSaveBlob(blob, `${filename}.csv`);
  } else {
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
