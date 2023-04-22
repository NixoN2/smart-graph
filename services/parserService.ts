import { parse } from "@solidity-parser/parser";
import {
  FunctionDefinition,
  VariableDeclarationStatement,
  VariableDeclaration,
  ElementaryTypeName,
  ArrayTypeName,
  Mapping,
  TypeName,
  Expression,
  ExpressionStatement,
  IfStatement,
  Block,
  UncheckedStatement,
  WhileStatement,
  DoWhileStatement,
  ForStatement,
  SimpleStatement,
  ReturnStatement,
  ThrowStatement,
  ContinueStatement,
  EmitStatement,
  FunctionCall,
  Statement,
  BreakStatement,
  FunctionTypeName,
  UserDefinedTypeName,
} from "@solidity-parser/parser/dist/src/ast-types";
import { retrieveName } from "../helpers/code";
import { Graph } from "graphlib";
import { GraphStructure } from "../types/graph-types";
import { graphService } from "./graphService";
import { printObject } from "../helpers/console";

export const parserService = {
  getAST: (solidityCode: string, shouldIncludeLocation: boolean) => {
    if (!solidityCode) {
      throw new Error("No solidity code was provided");
    }
    try {
      const ast = parse(solidityCode, { loc: shouldIncludeLocation });
      return ast;
    } catch (e) {
      console.log(e);
    }
  },
  parseArrayType: (type: ArrayTypeName) => {
    if ((type?.baseTypeName as ElementaryTypeName)?.name) {
      return `[${(type?.baseTypeName as ElementaryTypeName).name}]`;
    }
    return `[${parserService.parseArrayType(
      type?.baseTypeName as ArrayTypeName
    )}]`;
  },
  parseMappingType: (typename: Mapping) => {
    if (
      typename.keyType.type === "ElementaryTypeName" &&
      typename.valueType.type === "ElementaryTypeName"
    ) {
      return `${(typename.keyType as ElementaryTypeName).name} => ${
        (typename.valueType as ElementaryTypeName).name
      }`;
    }
    return `${(typename.keyType as ElementaryTypeName).name} => ${
      typename.valueType.type === "Mapping"
        ? parserService.parseMappingType(typename.valueType as Mapping)
        : typename.valueType.type === "ArrayTypeName"
        ? parserService.parseArrayType(typename.valueType as ArrayTypeName)
        : "not implemented mapping type"
    }`;
  },
  parseFunctionType: (type: FunctionTypeName) => {
    return {
      visibility: type.visibility,
      mutable: type.stateMutability,
      returnTypes: type.returnTypes.map((declaration) =>
        parserService.parseVariableDeclaration(declaration)
      ),
      parameters: type.parameterTypes.map((declaration) =>
        parserService.parseVariableDeclaration(declaration)
      ),
    };
  },
  parseUserDefinedType: (type: UserDefinedTypeName) => {
    return type.namePath;
  },
  parseType: (typename: TypeName) => {
    switch (typename.type) {
      case "ArrayTypeName":
        return parserService.parseArrayType(typename);
      case "ElementaryTypeName":
        return typename.name;
      case "Mapping":
        return parserService.parseMappingType(typename);
      case "FunctionTypeName":
        return parserService.parseFunctionType(typename);
      case "UserDefinedTypeName":
        return parserService.parseUserDefinedType(typename);
      default:
        return "not implemented";
    }
  },
  parseFunctionCall: (expression: FunctionCall) => {
    const parsedExpression = parserService.parseExpression(
      expression.expression
    );
    const args = expression.arguments.map(parserService.parseExpression);
    return {
      name: `function-call-${expression?.loc?.start?.line}`,
      expression: parsedExpression,
      names: expression.names,
      ids: expression.identifiers,
      args,
      order: `${parsedExpression?.order}${args.map(
        (arg) => ` => ${arg?.order}`
      )}`,
    };
  },
  parseExpression: (expression: Expression) => {
    switch (expression?.type) {
      case "IndexAccess":
        const indexBase = parserService.parseExpression(expression.base);
        const index = parserService.parseExpression(expression.index);
        return {
          name:
            parserService.parseExpression(expression.base)?.name ||
            `index-access-${expression?.loc?.start?.line}`,
          base: indexBase,
          index,
          order: `${indexBase?.order}[${index?.order}]`,
        };

      case "IndexRangeAccess":
        const start = parserService.parseExpression(expression.indexStart);
        const end = parserService.parseExpression(expression.indexEnd);
        const base = parserService.parseExpression(expression.base);
        return {
          name:
            parserService.parseExpression(expression.base)?.name ||
            `index-range-access-${expression?.loc?.start?.line}`,
          base,
          start,
          end,
          order: `${base?.order}[${start?.order},${end?.order}]`,
        };
      case "TupleExpression":
        return {
          name: `tuple_${expression?.loc?.start?.line}`,
          components: expression.components,
          isArray: expression.isArray,
          order: "to do tuple",
        };
      case "BinaryOperation":
        const left = parserService.parseExpression(expression.left);
        const right = parserService.parseExpression(expression.right);
        return {
          name: `binary-${expression?.loc?.start?.line}`,
          left,
          right,
          operator: expression.operator,
          order: `${left?.order}${expression.operator}${right?.order}`,
        };
      case "Conditional":
        return {
          name: `conditional-${expression?.loc?.start?.line}`,
          condition: parserService.parseExpression(expression.condition),
          true: parserService.parseExpression(expression.trueExpression),
          false: parserService.parseExpression(expression.falseExpression),
          order: "conditional to do",
        };
      case "MemberAccess":
        const parsedExpression = parserService.parseExpression(
          expression.expression
        );
        return {
          name: `member-access-${expression?.loc?.start?.line}`,
          memberName: expression.memberName,
          expression: parsedExpression,
          order: `${parsedExpression?.order}.${expression.memberName}`,
        };
      case "FunctionCall":
        return parserService.parseFunctionCall(expression);
      case "UnaryOperation":
        const subExpression = parserService.parseExpression(
          expression.subExpression
        );
        return {
          name: `unary-${expression?.loc?.start?.line}`,
          operator: expression.operator,
          subExpression,
          order: `${expression.operator}${subExpression?.order}`,
        };
      case "NewExpression":
        const type = parserService.parseType(expression.typeName);
        return {
          name: `new-${expression?.loc?.start?.line}`,
          type,
          order: `new ${typeof type === "string" ? type : type?.type}`,
        };
      case "NameValueExpression":
        return {
          name: `name-value-${expression?.loc?.start?.line}`,
          args: expression.arguments,
          expression: parserService.parseExpression(expression.expression),
        };
      case "BooleanLiteral":
        return {
          name: `boolean-${expression?.loc?.start?.line}`,
          value: expression.value,
          order: expression.value,
        };
      case "HexLiteral":
        return {
          name: `hex-${expression?.loc?.start?.line}`,
          value: expression.value,
          order: expression.value,
        };
      case "StringLiteral":
        return {
          name: `string-${expression?.loc?.start?.line}`,
          value: expression.value,
          order: expression.value,
        };
      case "NumberLiteral":
        return {
          name: `number-${expression?.loc?.start?.line}`,
          value: expression.number,
          order: expression.number,
        };
      case "Identifier":
        return {
          name: `id-${expression?.loc?.start?.line}`,
          id: expression.name,
          order: expression.name,
        };
      case "ArrayTypeName":
        const arrayType = parserService.parseArrayType(expression);
        return {
          name: `array-${expression?.loc?.start?.line}`,
          type: arrayType,
          order: arrayType,
        };
      case "ElementaryTypeName":
        return {
          name: `elementary-type-name-${expression?.loc?.start?.line}`,
          type: expression.name,
          order: expression.name,
        };
      case "FunctionTypeName":
        return {
          name: `function-type-${expression?.loc?.start?.line}`,
          variables: expression.parameterTypes,
          returnVariables: expression.returnTypes,
          visibility: expression.visibility,
        };
      case "Mapping":
        const mapping = parserService.parseMappingType(expression);
        return {
          name: `mapping-${expression?.loc?.start?.line}`,
          type: mapping,
          order: mapping,
        };
      case "UserDefinedTypeName":
        return {
          name: `user-defined-type-${expression?.loc?.start?.line}`,
          type: expression.namePath,
          order: expression.namePath,
        };
      default:
        "not implemented expression type";
    }
  },
  parseBlock: (block: Block) => {
    return block.statements.map((statement) =>
      parserService.parseExpression(
        (statement as ExpressionStatement).expression
      )
    );
  },
  parseCondition: (condition: Expression) => {
    return parserService.parseExpression(condition);
  },
  parseIfBodies: (statement: IfStatement) => {
    let condition = parserService.parseCondition(statement.condition);
    let trueBody = statement.trueBody;
    let falseBody = statement.falseBody;
    let parsedTrueBody = null;
    let parsedFalseBody = null;
    if (trueBody && trueBody.type === "Block") {
      parsedTrueBody = parserService.parseBlock(trueBody);
    }
    if (falseBody && falseBody?.type === "Block") {
      parsedFalseBody = parserService.parseBlock(falseBody);
    }
    return parsedTrueBody && parsedFalseBody
      ? [condition, ...parsedTrueBody, ...parsedFalseBody]
      : parsedTrueBody
      ? [condition, ...parsedTrueBody]
      : parsedFalseBody
      ? [condition, ...parsedFalseBody]
      : "null";
  },
  parseIfStatement: (statement: IfStatement) => {
    let result = parserService.parseIfBodies(statement);
    let falseBody = statement.falseBody;
    while (falseBody?.type === "IfStatement") {
      result = [...result, ...parserService.parseIfBodies(falseBody)];
      falseBody = falseBody.falseBody;
    }
    if (typeof result !== "string") {
      return result;
    }
  },
  parseBreakStatement: (statement: BreakStatement) => {
    return {
      type: statement.type,
      name: `break-${statement?.loc?.start?.line}`,
    };
  },
  parseThrowStatement: (statement: ThrowStatement) => {
    return {
      type: statement.type,
      name: `break-${statement?.loc?.start?.line}`,
    };
  },
  parseContinueStatement: (statement: ContinueStatement) => {
    return {
      type: statement.type,
      name: `break-${statement?.loc?.start?.line}`,
    };
  },
  parseVariableDeclaration: (variable: VariableDeclaration) => {
    return (
      variable && {
        name: `variable-declaration-${variable.name}`,
        storageLocation: variable.storageLocation || "null",
        isConst: variable.isDeclaredConst || false,
        isState: variable.isStateVar,
        visibility: variable.visibility || "default",
        nodeType: "variable",
        type: parserService.parseType(variable.typeName),
      }
    );
  },
  parseVariableDeclarationStatement: (
    statement: VariableDeclarationStatement
  ) => {
    return {
      name: `variable-declaration-statement-${statement?.loc?.start?.line}`,
      variables: statement.variables.map((variable) =>
        parserService.parseVariableDeclaration(variable as VariableDeclaration)
      ),
      initialValue: parserService.parseExpression(statement.initialValue),
    };
  },
  parseSimpleStatement: (simpleStatement: SimpleStatement) => {
    if (simpleStatement.type === "ExpressionStatement") {
      return parserService.parseExpression(simpleStatement.expression);
    }
    return parserService.parseVariableDeclarationStatement(simpleStatement);
  },
  parseEmitStatement: (emitStatement: EmitStatement) => {
    return parserService.parseFunctionCall(emitStatement.eventCall);
  },
  parseDoWhileStatement: (statement: DoWhileStatement) => {
    const condition = parserService.parseCondition(statement.condition);
    const parsedStatement = parserService.parseStatement(statement.body);
    return {
      name: `do-while-statement-${statement?.loc?.start?.line}`,
      condition,
      statement: parsedStatement,
    };
  },
  parseWhileStatement: (statement: WhileStatement) => {
    const condition = parserService.parseCondition(statement.condition);
    const parsedStatement = parserService.parseStatement(statement.body);
    return {
      name: `while-statement-${statement?.loc?.start?.line}`,
      condition,
      statement: parsedStatement,
    };
  },
  parseForStatement: (statement: ForStatement) => {
    const { body, initExpression, conditionExpression, loopExpression } =
      statement;
    const init = parserService.parseSimpleStatement(initExpression);
    const condition = parserService.parseExpression(conditionExpression);
    const loop = parserService.parseExpression(loopExpression.expression);
    return {
      name: `if-${statement?.loc?.start?.line}`,
      init,
      condition,
      loop,
      body: parserService.parseStatement(body),
    };
  },
  parseExpressionStatement: (statement: ExpressionStatement) => {
    return {
      name: `expression-${statement?.loc?.start?.line}`,
      expression: parserService.parseExpression(statement.expression),
    };
  },
  parseReturnStatement: (statement: ReturnStatement) => {
    return {
      name: `return-${statement?.loc?.start?.line}`,
      expression: parserService.parseExpression(statement.expression),
    };
  },
  parseUncheckedStatement: (statement: UncheckedStatement) => {
    return {
      name: `unchecked-${statement?.loc?.start?.line}`,
      block: parserService.parseBlock(statement.block),
    };
  },
  parseStatement: (
    statement: Statement
  ):
    | (Object & { name: string })
    | any[]
    | { name: string; variables: any[]; initialValue: Object } => {
    switch (statement.type) {
      case "Block":
        return parserService.parseBlock(statement);
      case "BreakStatement":
        return parserService.parseBreakStatement(statement);
      case "ContinueStatement":
        return parserService.parseContinueStatement(statement);
      case "DoWhileStatement":
        return parserService.parseDoWhileStatement(statement);
      case "EmitStatement":
        return parserService.parseEmitStatement(statement);
      case "ExpressionStatement":
        return parserService.parseExpressionStatement(statement);
      case "ForStatement":
        return parserService.parseForStatement(statement);
      case "IfStatement":
        return parserService.parseIfStatement(statement);
      case "ReturnStatement":
        return parserService.parseReturnStatement(statement);
      case "ThrowStatement":
        return parserService.parseThrowStatement(statement);
      case "UncheckedStatement":
        return parserService.parseUncheckedStatement(statement);
      case "VariableDeclarationStatement":
        return parserService.parseVariableDeclarationStatement(statement);
      case "WhileStatement":
        return parserService.parseWhileStatement(statement);
      default:
        break;
    }
  },
  parseStatementGraph: (statementGraph: string) => {
    return statementGraph.split(" => ");
  },
  parseLine: (name: string) => {
    const splittedName = name.split("-");
    return (
      Number.parseInt(splittedName?.[splittedName?.length - 1], 10) || null
    );
  },
  parseFunctionBody: (node: FunctionDefinition, graph: GraphStructure) => {
    const stateVariables = graphService.getNodesByType(graph, "variable");
    const controlFlowGraph: GraphStructure = new Graph();
    let previousNode = { name: "Start" };
    node?.body?.statements?.forEach((statement) => {
      const parseResult = parserService.parseStatement(statement as Statement);
      if (parseResult) {
        if (Array.isArray(parseResult)) {
          parseResult.forEach((parseNode) => {
            if (parseNode) {
              const hasOrderInTopLevel = 'order' in parseResult
              const topLevelExpression = (parseNode as  {
                name: string;
                order: string
              })?.order
              const expressionStatement = (parseNode as {
                name: string;
                expression: {
                  order: string
                }
              })?.expression?.order
              const order = hasOrderInTopLevel ? topLevelExpression : expressionStatement
              stateVariables.forEach((variable) => {
                if (order?.includes(retrieveName(variable.name))) {
                  graph.setEdge(
                    variable.name,
                    (parseNode as { name: string }).name,
                    parseNode
                  );
                }
              });
              previousNode = graphService.addNodeToGraph(
                controlFlowGraph,
                previousNode,
                parseNode
              );
            }
          });
        } else if (parseResult) {
          const hasOrderInTopLevel = 'order' in parseResult
          const topLevelExpression = (parseResult as  {
            name: string;
            order: string
          })?.order
          const expressionStatement = (parseResult as {
            name: string;
            expression: {
              order: string
            }
          })?.expression?.order
          const order = hasOrderInTopLevel ? topLevelExpression : expressionStatement
          stateVariables.forEach((variable) => {
            if (order?.includes(retrieveName(variable.name))) {
              graph.setEdge(
                variable.name,
                (parseResult as { name: string }).name,
                parseResult
              );
            }
          });
          previousNode = graphService.addNodeToGraph(
            controlFlowGraph,
            previousNode,
            parseResult
          );
        }
      }
    });
    controlFlowGraph.setEdge(
      previousNode.name,
      "End",
      previousNode.name + "_" + "End"
    );
    return controlFlowGraph;
  },
};
