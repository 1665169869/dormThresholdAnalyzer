
const path = require('path');

const fs = require('fs');
const readline = require('readline');
const { parse } = require('csv-parse');
const { cloneDeep } = require('lodash');

(async function () {
    const threshold = {
        // 小于等于该值，则该宿舍需整改
        "violationThresholds": {
            "垃圾未倒": 0,
            "厕所": 1,
            "用电安全": 10
        },

        // 宿舍卫生等级
        "hygieneCategories": {
            "优秀宿舍": {
                "minScore": 85
            },
            "良好宿舍": {
                "minScore": 83,
                "maxScore": 85
            }
        }
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const csvPath = true ? await new Promise((resolve, reject) => {
        rl.question('Please enter the path of the csv file: ', (csvPath) => {
            resolve(csvPath);
            rl.close();
        });
    }) : 'test.csv';

    let csvData = await readCsv(csvPath);

    csvData = csvData.slice(3);
    csvData = csvData.map(row => {
        const 宿舍号 = Number(row[0]);
        const 内务分 = Number(row[7]);
        const 未乱挂物品分 = Number(row[14]);
        const 室内物品摆放整齐分 = Number(row[21]);
        const 公共区域卫生分 = Number(row[22]);
        const 阳台物品摆放整齐分 = Number(row[23]);
        const 宿舍墙面无乱贴乱画分 = Number(row[24]);
        const 宿舍垃圾分 = Number(row[25]);
        const 宿舍气味分 = Number(row[26]);
        const 宿舍浴室分 = Number(row[27]);
        const 宿舍厕所分 = Number(row[28]);
        const 宿舍禁烟酒分 = Number(row[29]);
        const 宿舍用电安全分 = Number(row[30]);

        const 宿舍总分 = Number(row[31]);

        return {
            宿舍号,
            内务分,
            未乱挂物品分,
            室内物品摆放整齐分,
            公共区域卫生分,
            阳台物品摆放整齐分,
            宿舍墙面无乱贴乱画分,
            宿舍垃圾分,
            宿舍气味分,
            宿舍浴室分,
            宿舍厕所分,
            宿舍禁烟酒分,
            宿舍用电安全分,
            宿舍总分,
        }
    });

    // 按楼层分组
    const floorGroups = {};
    for (const item of csvData) {
        const floor = Math.floor(item.宿舍号 / 100); // 假设前两位数字表示楼层
        if (!floorGroups[floor]) {
            floorGroups[floor] = [];
        }
        floorGroups[floor].push(cloneDeep(item));
    }

    const 优秀宿舍 = [];
    const 较优秀宿舍 = [];
    const 良好宿舍 = [];
    const 未倒垃圾宿舍 = [];
    // 包括但不限于风扇、排插、灯泡
    const 未关电宿舍 = [];
    const 厕所不达标宿舍 = [];
    const 不及格宿舍 = [];

    for (const floor of Object.keys(floorGroups)) {
        floorGroups[floor].sort((a, b) => b.宿舍总分 - a.宿舍总分);
        for (let i = 0; i < floorGroups[floor].length; i++) {
            const item = floorGroups[floor][i];
            // 排列前五优秀宿舍，其余宿舍添加到较优秀宿舍
            if (item.宿舍总分 >= threshold.hygieneCategories.优秀宿舍.minScore) {
                if (i < 5) {
                    优秀宿舍.push(item.宿舍号);
                } else {
                    较优秀宿舍.push(item.宿舍号);
                }
            } else if (
                item.宿舍总分 < threshold.hygieneCategories.良好宿舍.maxScore &&
                item.宿舍总分 >= threshold.hygieneCategories.良好宿舍.minScore
            ) {
                良好宿舍.push(item.宿舍号);
            } else if (item.宿舍总分 < 60) {
                不及格宿舍.push(item.宿舍号);
            }

            if (item.宿舍垃圾分 <= threshold.violationThresholds.垃圾未倒) {
                未倒垃圾宿舍.push(item.宿舍号);
            }

            if (item.宿舍厕所分 <= threshold.violationThresholds.厕所) {
                厕所不达标宿舍.push(item.宿舍号);
            }

            if (item.宿舍用电安全分 <= threshold.violationThresholds.用电安全) {
                未关电宿舍.push(item.宿舍号);
            }
        }
    }

    const currentDate = new Date();
    const formattedDate = `${currentDate.getMonth() + 1}月${currentDate.getDate()}日`;

    const 通报内容 = `
【${formattedDate}宿舍内务检查情况通报】

🏆 优秀宿舍（地面整洁/物品规范/无违规电器）：
${优秀宿舍.join('、') || '无'}

🏆 较优秀宿舍（地面整洁/无违规电器）：
${较优秀宿舍.join('、') || '无'}

✨ 良好宿舍（基本达标，存在个别细节问题）：
${良好宿舍.join('、') || '无'}

⚠ 需整改宿舍（未倒垃圾）：
${未倒垃圾宿舍.join('、') || '无'}

⚠ 需整改宿舍（未关电源/灯/排风/风扇）：
${未关电宿舍.join('、') || '无'}

⚠ 需整改宿舍（厕所不达标）：
${厕所不达标宿舍.join('、') || '无'}

${不及格宿舍.length == 0 ? '' : `
❌未及格宿舍（分数不达标）：
${不及格宿舍.join('、') || '无'}`}

（请相关宿舍于今日18:00前完成整改）
    `;
    console.log(通报内容.trim());

})()


async function readCsv(filePath) {
    const results = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(parse()) // 使用 csv-parser 解析
            .on('data', (row) => results.push(row)) // 每行数据
            .on('end', () => resolve(results)) // 解析完成
            .on('error', (err) => reject(err)); // 错误处理
    });
}