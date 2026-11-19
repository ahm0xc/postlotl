export type PageOptions = {
  url?: string;
  title?: string;
};

export type PayloadOptions = PageOptions & {
  referrer?: string;
};
