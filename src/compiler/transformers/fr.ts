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

            let containsSuper: boolean = false;
            let src = getSourceFileOfNode(node);
            let es2015nodeArray: Node[] = [];
            function checkNode(node: Node) {

                if (node.transformFlags & ts.TransformFlags.ContainsES2015) {
                    if (node.kind == SyntaxKind.SuperKeyword) {
                        containsSuper = true;
                    } else if (node.kind == SyntaxKind.ClassDeclaration || node.kind == SyntaxKind.ClassExpression) {
                        let commentRage = getLeadingCommentRangesOfNode(node, src);
                        if (commentRage) {
                            for (let comment of commentRage.map(r => src.text.slice(r.pos, r.end)))
                                if (comment.match(/^\/\/\s*@fr-es2015class/)) {
                                    es2015nodeArray.push(node);
                                    node.transformFlags &= ~ts.TransformFlags.ContainsES2015;
                                }
                        }
                    } else {
                        es2015nodeArray.push(node);
                        node.transformFlags &= ~ts.TransformFlags.ContainsES2015;
                    }
                }

                forEachChild(node, checkNode);
                //如果有super的调用，则其上级全部开启es2015的转换，一直到 classdeclaration 或  classExpression 否则super将不会被转换
                if (containsSuper) {
                    if (node.kind != SyntaxKind.ClassDeclaration && node.kind != SyntaxKind.ClassExpression) {
                        let index = es2015nodeArray.indexOf(node);
                        if (index >= 0) {
                            node.transformFlags |= ts.TransformFlags.ContainsES2015;
                            es2015nodeArray.splice(index, 1);
                        }

                    }else containsSuper = false;
                }
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
