import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], fileName: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const printDiv = (id: string) => {
  const content = document.getElementById(id);
  if (!content) return;
  const originalBody = document.body.innerHTML;
  document.body.innerHTML = content.innerHTML;
  window.print();
  document.body.innerHTML = originalBody;
  window.location.reload(); // To restore react state
};
