const API = "http://localhost:8000/api.php";

export async function downloadInvoicePdf(orderId) {
  const response = await fetch(
    `${API}?action=invoices&order_id=${encodeURIComponent(orderId)}&format=pdf`,
    { credentials: "include" }
  );
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.includes("application/pdf")) {
    const json = contentType.includes("application/json")
      ? await response.json().catch(() => ({}))
      : {};
    throw new Error(json.error ?? `Could not download invoice PDF (HTTP ${response.status}).`);
  }

  const pdf = await response.blob();
  const downloadUrl = URL.createObjectURL(pdf);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `invoice-${orderId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}
