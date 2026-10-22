declare module "pdfmake/build/pdfmake" {
  const pdfMake: {
    addVirtualFileSystem: (vfs: unknown) => void;
    createPdf: (definition: unknown) => {
      download: (filename?: string) => void;
      getBlob: (callback: (blob: Blob) => void) => void;
    };
  };
  export default pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {
  const vfs: Record<string, string>;
  export default vfs;
}
