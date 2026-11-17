export function selectedFiles(files: FileList | null): FileList | null {
  return files && files.length > 0 ? files : null;
}

/** What the field shows for the files: their names, joined by ", ". */
export function fileNames(files: ArrayLike<File> | null): string {
  return files ? Array.from(files, (file) => file.name).join(", ") : "";
}

/** Whether a key pressed on the field's text opens the file dialog. */
export function opensFileDialog(key: string): boolean {
  return key === "Enter" || key === " ";
}
