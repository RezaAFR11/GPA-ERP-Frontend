/** Download an API blob response without exposing authentication data in a URL. */
export async function downloadBlob(
  request: Promise<{ data: Blob }>,
  filename: string,
) {
  const response = await request;
  const objectUrl = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
