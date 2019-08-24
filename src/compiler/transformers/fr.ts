/*@internal*/
namespace ts {
    export function transformFR(context: TransformationContext) {

        return chainBundle(transformSourceFile);

        function transformSourceFile(node: SourceFile) {
            if (node.isDeclarationFile) {
                return node;
            }

            return visitEachChild(node, visitor, context);

        }

        function visitor(node: Node): VisitResult<Node> {
            switch (node.kind) {
                case SyntaxKind.InterfaceDeclaration:
                    return visitInterfaceDeclaration(<InterfaceDeclaration>node);

                default:
                    return visitEachChild(node, visitor, context);
            }
        }

        function visitInterfaceDeclaration(node: InterfaceDeclaration): VisitResult<Node> {

            let classMembers: ClassElement[] = [createConstructor(undefined, undefined, [],
                //调用或new 会触发异常
                createBlock([
                    createThrow(
                        createNew(
                            createIdentifier("Error"), undefined, []))])),

            //增加一个__interface的静态属性
            createProperty(undefined,
                [createToken(SyntaxKind.StaticKeyword)],
                "__fr_interface", undefined,
                createKeywordTypeNode(SyntaxKind.BooleanKeyword),
                createIdentifier("true"))];

            //     switch (member.kind) {
            //         case SyntaxKind.PropertySignature:
            //             classMembers.push(createProperty(
            //                 member.decorators,
            //                 member.modifiers,
            //                 (<PropertySignature>member).name,
            //                 (<PropertySignature>member).questionToken,
            //                 (<PropertySignature>member).type,
            //                 <Expression>createIdentifier( "undefined")));//prop如果没有初始化值将不会显示
            //             break;
            //         case SyntaxKind.MethodSignature:
            //             classMembers.push(createMethod(
            //                 member.decorators,
            //                 member.modifiers,
            //                 undefined,
            //                 (<MethodSignature>member).name,
            //                 (<MethodSignature>member).questionToken,
            //                 (<MethodSignature>member).typeParameters,
            //                 (<MethodSignature>member).parameters,
            //                 (<MethodSignature>member).type,
            //                 createBlock([])));//如果不设置block同样不显示
            //             break;
            //     }
            // }

            return createClassDeclaration(node.decorators, node.modifiers, node.name, node.typeParameters, node.heritageClauses, createNodeArray<ClassElement>(classMembers));

        }
    }

    export function transformFR2(context: TransformationContext) {

        let tf2015 = transformES2015(context);

        return chainBundle(transformSourceFile);

        function transformSourceFile(node: SourceFile) {
            if (node.isDeclarationFile) {
                return node;
            }

            let src = getSourceFileOfNode(node);
            let es2015nodeArray: Node[] = [];
            let checkStack: Array<Node> = [];
            function checkNode(node: Node) {
                checkStack.push(node);
                if (node.transformFlags & ts.TransformFlags.ContainsES2015) {

                    //function的参数也使用 es6 模式
                    if (isFunctionLike(node)) {
                        if (node.parameters) {
                            for (let par of node.parameters) {
                                if (par.transformFlags & ts.TransformFlags.ContainsES2015) {
                                    es2015nodeArray.push(node);
                                    par.transformFlags &= ~ts.TransformFlags.ContainsES2015;
                                }
                            }
                        }
                    }

                    if (node.kind == SyntaxKind.SuperKeyword) {
                        //如果有super的调用，则其上级全部开启es2015的转换，一直到 classdeclaration 或  classExpression 否则super将不会被转换
                        for (let i = checkStack.length - 1; i >= 0; i--) {
                            let stackNode = checkStack[i];
                            if (stackNode.kind != SyntaxKind.ClassDeclaration && stackNode.kind != SyntaxKind.ClassExpression) {
                                let index = es2015nodeArray.indexOf(stackNode);
                                if (index >= 0) {
                                    stackNode.transformFlags |= ts.TransformFlags.ContainsES2015;
                                    es2015nodeArray.splice(index, 1);
                                }
                            } else break;
                        }
                    } else if (node.kind == SyntaxKind.ClassDeclaration || node.kind == SyntaxKind.ClassExpression) {
                        let commentRage = getLeadingCommentRangesOfNode(node, src);
                        if (commentRage) {
                            for (let comment of commentRage.map(r => src.text.slice(r.pos, r.end)))
                                if (comment.match(/^\/\/\s*@fr-es2015class/)) {
                                    es2015nodeArray.push(node);
                                    node.transformFlags &= ~ts.TransformFlags.ContainsES2015;
                                }
                        }
                    }
                    else {
                        es2015nodeArray.push(node);
                        node.transformFlags &= ~ts.TransformFlags.ContainsES2015;
                    }
                }

                forEachChild(node, checkNode);
                checkStack.pop();
            }


            let result = visitEachChild(node, visitor, context);

            //const languageVersion = getEmitScriptTarget(context.getCompilerOptions());
            //在es2015模式下，class 也要进行转换，除非添加了 "//@fr-es2015class" 声明
            //  if (languageVersion >= ScriptTarget.ES2015) {
            forEachChild(node, checkNode);

            result = <SourceFile>tf2015(result);
            for (let i: number = 0; i < es2015nodeArray.length; i++) {
                //还原
                es2015nodeArray[i].transformFlags |= ts.TransformFlags.ContainsES2015;
            }
            //}

            return result;
        }

        function visitor(node: Node): VisitResult<Node> {
            return visitEachChild(node, visitor, context);
        }
    }


}
