type ShareFileData = {
  files?: File[];
  title?: string;
};

export async function saveCanvasAsPng(canvas: HTMLCanvasElement, filename: string) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error("Das Bild konnte nicht erstellt werden."));
    }, "image/png");
  });

  const file = new File([blob], filename, { type: "image/png" });
  const sharingNavigator = navigator as Navigator & {
    canShare?: (data: ShareFileData) => boolean;
    share?: (data: ShareFileData) => Promise<void>;
  };

  if (
    sharingNavigator.share
    && (!sharingNavigator.canShare || sharingNavigator.canShare({ files: [file] }))
  ) {
    try {
      await sharingNavigator.share({
        files: [file],
        title: "Lady Vanilla Ice",
      });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
