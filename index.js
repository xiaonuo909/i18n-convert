const fs = require('fs');
const path = require('path');

// https://www.npmjs.com/package/translation-jsapi
const { google } = require('translation-jsapi');

/**
 * 将中文的json文件放在zh文件夹下，执行 node index.js 后，会在out文件夹下生成对应的英文json文件
 *
 * 如果项目中已经有做了翻译的英文json文件，放在in文件夹下，执行 node index.js 后，
 * 会在out文件夹下生成对应的英文json文件，补充翻译缺失的文本
 */

// 翻译目标语言
const targetLang = 'en';
// 是否强制翻译所有文本
const translateAll = false;

const zhFolderPath = path.join(__dirname, './zh');
const inFolderPath = path.join(__dirname, './in');
const outFolderPath = path.join(__dirname, './out');

const zhKeyValuePairs = {};
const inKeyValuePairs = {};


function checkFile() {

  try {
    const files = fs.readdirSync(zhFolderPath);

    files.forEach(file => {
      const fileName = file.split('.')[0];
      zhKeyValuePairs[fileName] = {};
      const filePath = path.join(zhFolderPath, file);
      if (path.extname(file) === '.json') {
        try {
          const data = fs.readFileSync(filePath, 'utf8');
          const jsonContent = JSON.parse(data);
          Object.assign(zhKeyValuePairs[fileName], jsonContent);
        } catch (err) {
          console.error(err);
        }
      }
    });
  } catch (err) {
    console.error('读取zh JSON时出错：', err);
  }

  try {
    const files = fs.readdirSync(inFolderPath);

    files.forEach(file => {
      const fileName = file.split('.')[0];
      inKeyValuePairs[fileName] = {};
      const filePath = path.join(inFolderPath, file);
      if (path.extname(file) === '.json') {
        try {
          const data = fs.readFileSync(filePath, 'utf8');
          const jsonContent = JSON.parse(data);
          Object.assign(inKeyValuePairs[fileName], jsonContent);
        } catch (err) {
          console.error(err);
        }
      }
    });
  } catch (err) {
    console.error('读取in JSON时出错：:', err);
  }
}

async function translateText(text, targetLang) {
  try {
    const res = await google.translate({
      text: text,
      from: 'zh-CN',
      to: targetLang,
      // 如果是国内，可能需要设置为false，请求google.cn
      com: true
    });
    return res.result[0];
  } catch (error) {
    console.error('执行翻译时出错：', error);
  }
}

async function translateAndWriteMissingKeys() {
  for (const zhFileName in zhKeyValuePairs) {
    const zhContent = zhKeyValuePairs[zhFileName];
    const inContent = inKeyValuePairs[zhFileName] || {};

    await translateNestedKeys(zhContent, zhFileName, inContent);

    const sortedContent = {};
    Object.keys(inContent).sort().forEach(key => {
      sortedContent[key] = inContent[key];
    });

    const outFilePath = path.join(outFolderPath, `${zhFileName}.json`);
    fs.writeFileSync(outFilePath, JSON.stringify(sortedContent, null, 2), 'utf8');
  }
}

async function translateNestedKeys(zhContent, zhFileName, inContent) {
  for (const key in zhContent) {
    if (typeof zhContent[key] === 'object' && zhContent[key] !== null) {
      inContent[key] = inContent[key] || {};
      await translateNestedKeys(zhContent[key], inContent[key]);
    } else {
      if (translateAll || (inContent && !inContent.hasOwnProperty(key)) || (inContent && inContent[key] === '')) {
        const translatedText = await translateText(zhContent[key], targetLang);
        inContent[key] = translatedText;
        console.log(`翻译【${zhFileName}】文件【${key}】文本：${zhContent[key]} => ${translatedText}`);
      }
    }
  }
}

checkFile();

translateAndWriteMissingKeys().catch(err => {
  console.error('翻译过程中出错：', err);
}).finally(() => {
  console.log('处理完成');
});
