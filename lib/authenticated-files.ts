import { authenticatedFilesApi } from "./api";


export async function downloadAuthenticatedFile(fileUrl: string, filename: string) {
  const response = await authenticatedFilesApi.fetch(fileUrl);
  const objectUrl = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}


export async function openAuthenticatedFile(fileUrl: string) {
  const target = window.open("about:blank", "_blank");
  try {
    const response = await authenticatedFilesApi.fetch(fileUrl);
    const objectUrl = URL.createObjectURL(response.data);
    if (target) {
      target.location.href = objectUrl;
    } else {
      const link = document.createElement("a");
      link.href = objectUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    }
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (error) {
    target?.close();
    throw error;
  }
}
