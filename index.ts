import { getSourcePath } from "./helpers/environment";
import { getSolidityCode } from "./helpers/file";
import { parserService } from "./services/parserService";
import { graphService } from "./services/graphService";
import { issueService, issues } from "./services/issueService";
import { reportService } from "./services/reportService";
import { shouldIncludeLocation } from "./config/parser-config";
import { printObject } from "./helpers/console";

const commandArguments = process.argv;
const solidityCodePath = getSourcePath(commandArguments);
const solidityCode = getSolidityCode(solidityCodePath);

const ast = parserService.getAST(solidityCode, shouldIncludeLocation);

const intermediateGraphRepresentation =
  graphService.buildIntermediateGraphRepresentation(ast);
Object.keys(issueService).map((issue) =>
  issueService[issue](intermediateGraphRepresentation)
);
reportService.generateReport(issues);
reportService.printTotalIssues(solidityCodePath);
