// Firebase removed - using local storage only
export const subscribeToConfig = (_callback: (data: any) => void) => {
  return () => {};
};

export const updateConfig = async (_data: any) => {
  // No-op: Firebase removed
};
