import type { Issues } from "./issueService"
import { shouldIncludeLocation } from "../config/parser-config"

export let issueNumber = 0

export const reportService = {
    printTotalIssues: (filename: string) => {
        console.log("")
        if (issueNumber) {
            console.log(`There are ${issueNumber} issues found in ${filename}`)
        } else {
            console.log(`Issues not found in ${filename}`)
        }
    },
    printIssueInfo: (issueName: string, link: string) => {
        console.log("")
        console.log("issue:", issueName)
        console.log("the information about issue can be found at", link)
    },
    getIssueInfo: (issueName: string, link: string) => {
        return {
            issueName,
            link,
            occurances: []
        }
    },
    getIssueMessage: (message: string, line: number) => {
        issueNumber += 1
        return {
            message,
            line
        }
    },
    printIssueMessage: (message: string, line?: number) => {
        console.log("")
        console.log(message)
        if (shouldIncludeLocation) {
            console.log("issue is located on the line:", line)
        }
    },
    generateReport: (issues: Issues) => {
        Object.entries(issues).forEach((issueEntry) => {
            const issue = issueEntry[1]
            if (issue.occurances.length > 0) {
                reportService.printIssueInfo(issue.issueName, issue.link)
                issue.occurances.forEach((occurance) => reportService.printIssueMessage(occurance.message, shouldIncludeLocation ? occurance.line : undefined))
            }
        })
    }
}