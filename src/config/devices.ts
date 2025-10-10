export type FroniusDevice = {
  id: string;
  label: string;
  url: string;
};

export const devices: FroniusDevice[] = [
  {
    id: "nelsons-house",
    label: "Nelsons House",
    url: process.env.FRONIUS_NELSONS_URL ?? "http://192.168.50.97",
  },
  {
    id: "granny-flat",
    label: "Granny Flat",
    url: process.env.FRONIUS_GRANNY_URL ?? "http://192.168.50.27",
  },
];

export const propertyLabel = process.env.FRONIUS_PROPERTY_LABEL ?? "5 Oxford Road";
