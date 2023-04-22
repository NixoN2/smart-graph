export const retrieveName = (str: string, divider?: string) => {
  const splittedString = str.split(divider || "-")
  return splittedString[splittedString.length - 1]
}