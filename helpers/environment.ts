export const getSourcePath = (commandLineArgs: string[]) => {
    if (commandLineArgs.length === 0) {
        throw new Error("No command line arguments found. Please provide path to your solidity code in src")
    }
    return commandLineArgs.find((arg) => arg.startsWith("src=")).split("src=").join("")
}
