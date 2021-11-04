const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const util = require("../utils");

function provideCompletionItems(document, position, token, context) {
  const line = document.lineAt(position);
  const projectPath = util.getProjectPath(document);
  // 只截取到光标位置为止，防止一些特殊情况
  const lineText = line.text.substring(0, position.character);
  // 简单匹配，只要当前光标前的字符串为`this.dependencies.`都自动带出所有的依赖
  if (/(^|=| )\w+\.dependencies\.$/g.test(lineText)) {
    const json = require(`${projectPath}/package.json`);
    const dependencies = Object.keys(json.dependencies || {}).concat(
      Object.keys(json.devDependencies || {})
    );
    return dependencies.map((dep) => {
      // vscode.CompletionItemKind 表示提示的类型
      return new vscode.CompletionItem(dep, vscode.CompletionItemKind.Field);
    });
  }
}
/**
 * 光标选中当前自动补全item时触发动作，一般情况下无需处理
 * @param {*} item
 * @param {*} token
 */
function resolveCompletionItem(item, token) {
  return null;
}

/**
 * 查找文件定义的provider，匹配到了就return一个location，否则不做处理
 * 最终效果是，当按住Ctrl键时，如果return了一个location，字符串就会变成一个可以点击的链接，否则无任何效果
 * @param {*} document
 * @param {*} position
 * @param {*} token
 */
function provideDefinition(document, position, token) {
  const fileName = document.fileName;
  const workDir = path.dirname(fileName);
  const word = document.getText(document.getWordRangeAtPosition(position));

  // 只处理package.json文件
  if (/\/package\.json$/.test(fileName)) {
    const json = document.getText();
    if (
      new RegExp(
        `"(dependencies|devDependencies)":\\s*?\\{[\\s\\S]*?${word.replace(
          /\//g,
          "\\/"
        )}[\\s\\S]*?\\}`,
        "gm"
      ).test(json)
    ) {
      let destPath = `${workDir}/node_modules/${word.replace(
        /"/g,
        ""
      )}/package.json`;
      if (fs.existsSync(destPath)) {
        // new vscode.Position(0, 0) 表示跳转到某个文件的第一行第一列
        return new vscode.Location(
          vscode.Uri.file(destPath),
          new vscode.Position(0, 0)
        );
      }
    }
  }
}

exports.activate = function (context) {
  // 注册代码建议提示，只有当按下“.”时才触发
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      "javascript",
      {
        provideCompletionItems,
        resolveCompletionItem,
      },
      "."
    )
  );

  // 注册如何实现跳转到定义，第一个参数表示仅对json文件生效
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(["json"], {
      provideDefinition,
    })
  );
};
