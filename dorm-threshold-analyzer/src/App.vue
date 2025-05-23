<script setup>
import { ref } from 'vue'
import Papa from 'papaparse/'
import { cloneDeep } from 'lodash-es'

const resultTemplate = ref("");

const threshold = {
  // 小于等于该值，则该宿舍需整改
  "violationThresholds": {
    "垃圾未倒": 0,
    "厕所": 0,
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
    },
    "不及格宿舍": 70
  }
}

const readCsvFile = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        resolve(results);
      },
      error: (error) => {
        reject(error);
      }
    });
  });

}
const changeFile = async (e) => {
  const file = e.target.files[0];
  console.log(file, e.target.files);
  let csvData = (await readCsvFile(file)).data;
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
        优秀宿舍.push(item.宿舍号);
      } else if (
        item.宿舍总分 < threshold.hygieneCategories.良好宿舍.maxScore &&
        item.宿舍总分 >= threshold.hygieneCategories.良好宿舍.minScore
      ) {
        良好宿舍.push(item.宿舍号);
      } else if (item.宿舍总分 < threshold.hygieneCategories.不及格宿舍) {
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

🏆 优秀宿舍（地面整洁/物品规范/无违规电器）85分以上：
${优秀宿舍.join('、') || '无'}

✨ 良好宿舍（基本达标，存在个别细节问题）83-85分的：
${良好宿舍.join('、') || '无'}

⚠ 需整改宿舍（未倒垃圾）0分：
${未倒垃圾宿舍.join('、') || '无'}

⚠ 需整改宿舍（未关电源/灯/排风/风扇）10分及以下：
${未关电宿舍.join('、') || '无'}

⚠ 需整改宿舍（厕所不达标）0分：
${厕所不达标宿舍.join('、') || '无'}
${不及格宿舍.length == 0 ? '' : `
❌未及格宿舍（宿舍卫生不达标）低于70分：
${不及格宿舍.join('、') || '无'}`}

（请相关宿舍于今日18:00前完成整改）`;

  resultTemplate.value = 通报内容;

}

</script>

<template>
  <div class="container">
    <div class="title">
      <h1>宿舍内务检查结果通报</h1>
      <div class="subtitle">
        <p>
          本系统用于自动生成宿舍内务检查结果通报，请上传csv文件。
        </p>
      </div>
    </div>

    <div class="upload">
      <input type="file" accept="text/csv,.csv" @change="changeFile">
    </div>

    <div class="result-template">
      <textarea v-model="resultTemplate">
      </textarea>
    </div>
  </div>
</template>

<style scoped>
.container {
  width: 100%;
  margin: 0 auto;
  text-align: center;
}
.result-template textarea {
  height: 500px;
  width: 80%;
  font-size: 16px;
  outline: nonex;
}
</style>
