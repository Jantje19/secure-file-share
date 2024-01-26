export type OpenedFile = {
  id: string;
  name: string;
  data: ArrayBuffer;
  type: string;
  size: number;
};

const modernPicker = async () => {
  const files = await window
    .showOpenFilePicker({
      multiple: true,
    })
    .catch((err) => {
      if (err.name === 'AbortError') {
        return null;
      }

      throw err;
    });

  if (!files) {
    return null;
  }

  return Promise.all(files.filter((file) => file.kind === 'file').map((file) => file.getFile()));
};

const oldPicker = async () => {
  const elem = document.createElement('input');

  elem.type = 'file';
  elem.multiple = true;
  elem.style.display = 'none';
  elem.click();

  return new Promise<File[] | null>((resolve) => {
    elem.onchange = () => {
      elem.onchange = null;

      resolve(elem.files ? Array.from(elem.files) : null);
    };
  });
};

export const openFilePicker = async (): Promise<OpenedFile[] | null> => {
  const files = await ('showOpenFilePicker' in window ? modernPicker() : oldPicker());

  if (!files) {
    return null;
  }

  return Promise.all(
    files.map(async (file) => ({ id: crypto.randomUUID(), name: file.name, data: await file.arrayBuffer(), type: file.type, size: file.size }))
  );
};

const modernSave = async (file: File) => {
  const fileExtension = file.name.split('.').at(-1);

  const handle = await window
    .showSaveFilePicker({
      types: [{ accept: { [file.type]: fileExtension ? [`.${fileExtension}` as `.${string}`] : [] } }],
      suggestedName: file.name,
    })
    .catch((err) => {
      if (err.name === 'AbortError') {
        return null;
      }

      throw err;
    });

  if (!handle) {
    return false;
  }

  const writeStream = await handle.createWritable({ keepExistingData: false });

  await file.stream().pipeTo(writeStream);

  return true;
};

export const saveFile = async (file: File): Promise<boolean> => {
  if ('showSaveFilePicker' in window) {
    return modernSave(file);
  }

  const element = document.createElement('a');

  element.download = file.name;

  const blobURL = URL.createObjectURL(file);

  element.style.display = 'none';
  element.download = file.name;
  element.href = blobURL;

  document.body.append(element);
  element.click();

  await new Promise<void>((resolve) => {
    setTimeout(() => {
      URL.revokeObjectURL(blobURL);
      element.remove();
      resolve();
    }, 1000);
  });

  return true;
};
