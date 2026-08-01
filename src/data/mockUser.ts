export type MockUser = {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: string;
};

export const mockUser: MockUser = {
  id: "u_001",
  name: "Ava Lindqvist",
  email: "ava@summarix.ai",
  initials: "AL",
  role: "Product Lead",
};

export const teammates = [
  { id: "u_002", name: "Marco Reyes", initials: "MR" },
  { id: "u_003", name: "Priya Nair", initials: "PN" },
  { id: "u_004", name: "Tom Okafor", initials: "TO" },
  { id: "u_001", name: "Ava Lindqvist", initials: "AL" },
];
