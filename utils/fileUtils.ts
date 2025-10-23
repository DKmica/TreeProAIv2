export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // result is "data:mime/type;base64,..."
      // we want to get rid of the prefix
      const base64String = (reader.result as string).split(',')[1];
      if (base64String) {
        resolve(base64String);
      } else {
        reject(new Error('Failed to convert file to base64.'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};
