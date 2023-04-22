import { readFileSync } from "fs";

export const saveFolder = "./images"

export const getSolidityCode = (path: string) => {
    if (!path) {
        throw new Error("No path to the solidity code found. Please provide correct path to .sol file")
    }
    const fileContent = readFileSync(path, "utf-8")
    return fileContent
}
