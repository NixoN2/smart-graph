import { reportService } from "./reportService";
import { retrieveName } from "../helpers/code";
import {
  Function,
  GraphStructure,
  Pragma,
  StateVariable,
  IntervalPragma,
  ExactPragma,
  UsingFor,
  Expression,
  Variable,
  VariableDeclaration,
} from "../types/graph-types";
import { graphService } from "./graphService";
import { parserService } from "./parserService";
import { printObject } from "../helpers/console";

export interface Issues {
  [key: string]: {
    issueName: string;
    link: string;
    occurances: Array<{ message: string; line: number }>;
  };
}

export const issues: Issues = {};

export const issueService = {
  swc100: (IRGraph: GraphStructure) => {
    const functionNodes = graphService.getNodesByType(IRGraph, "function");
    issues["swc100"] = reportService.getIssueInfo(
      "SWC100 - Function Default Visibility",
      "https://swcregistry.io/docs/SWC-100"
    );
    functionNodes.map((node) => {
      if ((node as Function).visibility === "default") {
        issues["swc100"].occurances.push(
          reportService.getIssueMessage(
            `Functions that do not have a function visibility type specified are public by default. This can lead to a vulnerability if a developer forgot to set the visibility and a malicious user is able to make unauthorized or unintended state changes.`,
            node?.loc?.start?.line
          )
        );
      }
    });
  },
  swc101: (IRGraph: GraphStructure) => {
    const versionNodes = graphService.getNodesByType(IRGraph, "version");
    issues["swc101"] = reportService.getIssueInfo(
      "SWC101 - Integer Overflow and Underflow",
      "https://swcregistry.io/docs/SWC-101"
    );
    let skip = false;
    versionNodes.forEach((node) => {
      if (node.type === "interval") {
        const typedNode = node as IntervalPragma;
        const version = typedNode.leftVersion;
        if (+version[0] > 0 || +version[1] >= 8) {
          skip = true;
        }
      } else {
        const typedNode = node as ExactPragma;
        const version = typedNode.version;
        if (+version[0] > 0 || +version[1] >= 8) {
          skip = true;
        }
      }
    });
    if (skip) {
      return;
    }
    const usingForDeclarations = graphService.getNodesByType(
      IRGraph,
      "using-for"
    );
    usingForDeclarations.forEach((node) => {
      const typedNode = node as UsingFor;
      if (typedNode.name.split("_")[0] === "SafeMath") {
        skip = true;
      }
    });
    if (skip) {
      return;
    }
    const functionNodes = graphService.getNodesByType(IRGraph, "function");
    functionNodes.forEach((node) => {
      const typedNode = node as Function;
      const body = typedNode.body;
      const bodyExpressions = graphService.getNodesByNames(body, [
        "expression",
      ]);
      bodyExpressions.forEach((exp) => {
        exp.forEach((expression) => {
          const typedExpression = expression as unknown as Expression;
          const operation = typedExpression.expression;
          if (
            operation.name.startsWith("binary") ||
            operation.name.startsWith("unary")
          ) {
            issues["swc101"].occurances.push(
              reportService.getIssueMessage(
                `An overflow/underflow happens when an arithmetic operation reaches the maximum or minimum size of a type. For instance if a number is stored in the uint8 type, it means that the number is stored in a 8 bits unsigned number ranging from 0 to 2^8-1. In computer programming, an integer overflow occurs when an arithmetic operation attempts to create a numeric value that is outside of the range that can be represented with a given number of bits – either larger than the maximum or lower than the minimum representable value.`,
                parserService.parseLine(operation.name)
              )
            );
          }
        });
      });
    });
  },
  swc102: (IRGraph: GraphStructure) => {
    const [, latestMinor] = [0, 8, 19];
    const versionNodes = graphService.getNodesByType(IRGraph, "version");
    issues["swc102"] = reportService.getIssueInfo(
      "SWC102 - Outdated Compiler Version",
      "https://swcregistry.io/docs/SWC-102"
    );
    versionNodes.map((node: Pragma) => {
      if (node.type === "exact" || node.type === "inexact") {
        const [major, minor] = node.version.map((s) => +s);
        if (major === 0 && minor < latestMinor) {
          issues["swc102"].occurances.push(
            reportService.getIssueMessage(
              `Using an outdated compiler version can be problematic especially if there are publicly disclosed bugs and issues that affect the current compiler version.`,
              node?.loc?.start?.line
            )
          );
        }
      }
      if (node.type === "interval") {
        const [major, minor] = node.leftVersion.map((s) => +s);
        if (major === 0 && minor < latestMinor) {
          issues["swc102"].occurances.push(
            reportService.getIssueMessage(
              `Using an outdated compiler version can be problematic especially if there are publicly disclosed bugs and issues that affect the current compiler version.`,
              node?.loc?.start?.line
            )
          );
        }
      }
    });
  },

  swc103: (IRGraph: GraphStructure) => {
    const versionNodes = graphService.getNodesByType(IRGraph, "version");
    issues["swc103"] = reportService.getIssueInfo(
      "SWC103 - Floating Pragma",
      "https://swcregistry.io/docs/SWC-103"
    );
    versionNodes.map((node) => {
      if (node.type !== "exact") {
        issues["swc103"].occurances.push(
          reportService.getIssueMessage(
            `Contracts should be deployed with the same compiler version and flags that they have been tested with thoroughly. Locking the pragma helps to ensure that contracts do not accidentally get deployed using, for example, an outdated compiler version that might introduce bugs that affect the contract system negatively.`,
            node?.loc?.start?.line
          )
        );
      }
    });
  },
  swc104: (IRGraph: GraphStructure) => {
    const functions = graphService.getNodesByType(IRGraph, "function");
    issues["swc104"] = reportService.getIssueInfo(
      "SWC104 - Unchecked Call Return Value",
      "https://swcregistry.io/docs/SWC-104"
    );
    functions.map((func: Function) => {
      const body = func.body;
      const bodyExpressions = graphService.getNodesByNames(body, [
        "expression",
      ]);
      bodyExpressions.forEach((expressions) => {
        expressions.forEach((exp) => {
          const expressionContent = parserService.parseStatementGraph(
            (exp as unknown as Expression)?.expression?.order
          );
          const hasCall = expressionContent.findIndex((command) =>
            command.includes(".call")
          );
          const assertion = expressionContent.findIndex(
            (command) =>
              command.includes("require") || command.includes("assert")
          );
          if (hasCall > -1 && assertion < 0) {
            issues["swc104"].occurances.push(
              reportService.getIssueMessage(
                `The return value of a message call is not checked. Execution will resume even if the called contract throws an exception. If the call fails accidentally or an attacker forces the call to fail, this may cause unexpected behaviour in the subsequent program logic.`,
                parserService.parseLine(exp.name)
              )
            );
          }
        });
      });
    });
  },
  swc106: (IRGraph: GraphStructure) => {
    const functions = graphService.getNodesByType(IRGraph, "function");
    issues["swc106"] = reportService.getIssueInfo(
      "SWC106 - Unprotected SELFDESTRUCT Instruction",
      "https://swcregistry.io/docs/SWC-106"
    );
    functions.map((func: Function) => {
      const body = func.body;
      const bodyExpressions = graphService.getNodesByNames(body, [
        "expression",
      ]);
      bodyExpressions.forEach((expressions) => {
        expressions.forEach((exp) => {
          const expressionContent = parserService.parseStatementGraph(
            (exp as unknown as Expression)?.expression?.order
          );
          const hasSelfDestruct = expressionContent.find((command) =>
            command.includes("selfdestruct")
          );
          if (
            hasSelfDestruct &&
            (func.visibility === "default" ||
              func.visibility === "public" ||
              func.visibility === "external")
          ) {
            issues["swc106"].occurances.push(
              reportService.getIssueMessage(
                `Due to missing or insufficient access controls, malicious parties can self-destruct the contract`,
                parserService.parseLine(exp.name)
              )
            );
          }
        });
      });
    });
  },
  swc107: (IRGraph: GraphStructure) => {
    issues["swc107"] = reportService.getIssueInfo(
      "SWC107 - Reentrancy",
      "https://swcregistry.io/docs/SWC-107"
    );
    const inherit = graphService.getNodesByType(IRGraph, "inherit");
    const expressionsUsingState =
      graphService.getEdgesByStateVariables(IRGraph);
    const expressionIndexes = expressionsUsingState
      .map(
        (node) =>
          "name" in (node as Expression) &&
          (node as Expression)?.name?.split("-")?.[1]
      )
      .filter((val) => !!val)
      .map((line) => Number.parseInt(line, 10));
    const hasReentrancyGuard = inherit.filter(
      (contract) => contract.name === "ReentrancyGuard"
    );
    const functions = graphService.getNodesByType(IRGraph, "function");

    functions.forEach((func) => {
      const typedNode = func as Function;
      const hasReentrancyModifier =
        typedNode.modifiers.length > 0 &&
        typedNode.modifiers.find(
          (modifier) => modifier.name === "nonReentrant"
        );
      if (hasReentrancyGuard && hasReentrancyModifier) {
        return;
      }
      const possibleReentrancyModifiers = typedNode.modifiers.filter(
        (modifier) => modifier.name.toLowerCase().includes("reentr")
      );
      if (possibleReentrancyModifiers.length > 0) {
        return;
      }
      const body = typedNode.body;
      const nodes = graphService.getNodesByEdges(body);
      const statementsOrder = nodes
        .map((statement) => {
          return {
            line: parserService.parseLine((statement as unknown as { name: string; order: string }).name),
            order: (statement as unknown as { name: string; order: string })
              .order,
          };
        })
        .filter((value) => !!value?.order);
      const statementsWithCall = statementsOrder.filter(({ order }) =>
        order.includes("call")
      )
      const indexes = statementsWithCall.map((statement) =>
        +statement.line
      );
      indexes.forEach((line) => {
        expressionIndexes.forEach((expLine) => {
          if (expLine > line) {
            issues["swc107"].occurances.push(
              reportService.getIssueMessage(
                `One of the major dangers of calling external contracts is that they can take over the control flow. In the reentrancy attack (a.k.a. recursive call attack), a malicious contract calls back into the calling contract before the first invocation of the function is finished. This may cause the different invocations of the function to interact in undesirable ways.`,
                expLine
              )
            );
          }
        })
      })
    });
  },
  swc108: (IRGraph: GraphStructure) => {
    const stateVariables = graphService.getNodesByType(IRGraph, "variable");
    issues["swc108"] = reportService.getIssueInfo(
      "SWC108 - State Variable Default Visibility",
      "https://swcregistry.io/docs/SWC-108"
    );
    stateVariables.forEach((variable) => {
      if ((variable as StateVariable).visibility === "default") {
        issues["swc108"].occurances.push(
          reportService.getIssueMessage(
            `Labeling the visibility explicitly makes it easier to catch incorrect assumptions about who can access the variable.`,
            variable?.loc?.start?.line
          )
        );
      }
    });
  },
  swc119: (IRGraph: GraphStructure) => {
    issues["swc119"] = reportService.getIssueInfo(
      "SWC119 - Shadowing State Variables",
      "https://swcregistry.io/docs/SWC-119"
    );
    const stateVariables = graphService.getNodesByType(IRGraph, "variable");
    const stateIds = stateVariables.map((node) => {
      const typedNode = node as StateVariable;
      return typedNode.name;
    });
    const functions = graphService.getNodesByType(IRGraph, "function");
    functions.map((node) => {
      const typedNode = node as Function;
      const body = typedNode.body;
      const declarations = graphService.getNodesByNames(body, [
        "variable-declaration",
      ])[0];
      const parameters = typedNode.parameters.map((parameter) => retrieveName(parameter.name))
      parameters.forEach((parameter) => {
        if (stateIds.find((id) => id === parameter)) {
          issues["swc119"].occurances.push(
            reportService.getIssueMessage(
              `Solidity allows for ambiguous naming of state variables when inheritance is used. Contract A with a variable x could inherit contract B that also has a state variable x defined. This would result in two separate versions of x, one of them being accessed from contract A and the other one from contract B. In more complex contract systems this condition could go unnoticed and subsequently lead to security issues. Shadowing state variables can also occur within a single contract when there are multiple definitions on the contract and function level.`,
              typedNode?.loc?.start?.line
            )
          );
        }
      })

      declarations.map((node) => {
        const typedNode = node as unknown as VariableDeclaration;
        const variables = typedNode.variables;
        variables.forEach((variable) => {
          const name = retrieveName(variable.name);
          if (stateIds.find((id) => id === name)) {
            issues["swc119"].occurances.push(
              reportService.getIssueMessage(
                `Solidity allows for ambiguous naming of state variables when inheritance is used. Contract A with a variable x could inherit contract B that also has a state variable x defined. This would result in two separate versions of x, one of them being accessed from contract A and the other one from contract B. In more complex contract systems this condition could go unnoticed and subsequently lead to security issues. Shadowing state variables can also occur within a single contract when there are multiple definitions on the contract and function level.`,
                parserService.parseLine(typedNode.name)
              )
            );
          }
        });
      });
    });
  },
};
