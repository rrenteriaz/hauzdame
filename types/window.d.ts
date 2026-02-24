export {};
declare global {
  interface Window {
    focusCleanerSection?: (sectionId?: string) => void;
  }
}
