const ResumeParser = require("resume-parser");
var textract = require("textract");
const fs = require("fs");

const fileName = "resume6";
const filePath = `./files/${fileName}.pdf`;
const jsonRes = `res_${fileName}.json`;

function extractWithYears(data) {
  var yearRegex = /\d{4}\-\d{4}|\d{4}/;
  return Array.isArray(data)
    ? data.filter(element => yearRegex.test(element))
    : [];
}

function extractDegree(data) {
  var degreeRegex = /Ph.D|B.S|B.A|BS|BA|Associate|A.S|Bachelors|Masters|PhD|Diploma/;
  return Array.isArray(data)
    ? data.filter(element => degreeRegex.test(element))
    : [];
}

//todo: if there are 2 months and only one year ==> assume it is the same year so we have (month1, year) + (month2, year)
function getMonth(s) {
  const monthsMapping = {
    january: 1,
    jan: 1,
    february: 2,
    feb: 2,
    march: 3,
    mar: 3,
    april: 4,
    may: 5,
    jun: 6,
    // july: 7,
    jul: 7,
    aug: 8,
    // september: 9,
    sep: 9,
    // october: 10,
    oct: 10,
    // november: 11,
    nov: 11,
    // december: 12,
    dec: 12,
    spring: 3,
    summer: 6,
    fall: 10,
    winter: 12
  };
  let res = [];
  str = s.toLowerCase();
  Object.keys(monthsMapping).forEach(month => {
    if (str.indexOf(month) !== -1) {
      res.push(monthsMapping[month]);
      s =
        s.substring(0, str.indexOf(month)) +
        s.substring(str.indexOf(month) + month.length);
    }
  });
  return { str: s, months: res };
}

function splitYears(s) {
  var yearRegex = /\d{4}\-\d{4}|\d{4}/g;
  if (Array.isArray(s)) {
    let result = [];
    s.forEach(element => {
      let years = [];
      let startIndex = 100000; //to determine if year is at the beginning of sentence or end
      let endIndex = -1;
      while ((match = yearRegex.exec(element)) != null) {
        let start = match.index;
        let end = match.index + match[0].length;
        years.push(element.substring(start, end));
        startIndex = Math.min(start, startIndex);
        endIndex = Math.max(end, endIndex);
      }
      let description = "";
      let time = "";
      //Assumption that year is usually at the end or at the front
      if (startIndex > element.length / 2) {
        description = element.substring(0, startIndex);
        time = element.substring(startIndex);
      } else {
        //Year is at the front
        time = element.substring(0, endIndex);
        description = element.substring(endIndex);
      }
      let temp1 = getMonth(description);
      description = temp1.str;
      months = temp1.months;

      let temp2 = getMonth(time);
      time = temp2.str;
      months.concat(temp2.months);

      time = time.split("-");
      let res = {
        time: time,
        months: months,
        description: description
      };
      result.push(res);
    });
    return result;
  }
  return [];
}

ResumeParser.parseResume(filePath, "./files/compiled") // input file, output dir
  .then(file => {
    let rawdata = fs.readFileSync("./files/compiled/" + fileName + ".pdf.json");
    let resume = JSON.parse(rawdata);
    let {
      name,
      email,
      profiles,
      education,
      projects,
      technology,
      skills,
      experience,
      additional
    } = resume;
    education = education.replace(/present|now/gi, new Date().getFullYear());
    experience = experience.replace(/present|now/gi, new Date().getFullYear());
    console.log(education);
    console.log(experience);
    let educationParts = education ? education.split("\n") : [];
    let projectsParts = projects ? projects.split("\n") : [];
    let experienceParts = experience ? experience.split("\n") : [];

    degreeParts = extractDegree(educationParts);
    educationParts = extractWithYears(educationParts);
    educationParts = splitYears(educationParts);
    projectsParts = extractWithYears(projectsParts);
    experienceParts = extractWithYears(experienceParts);
    experienceParts = splitYears(experienceParts);
    if (skills && skills.indexOf("\n" !== -1)) {
      skills = skills.replace(/(\n)+/g, ", ");
    }
    res = {
      name,
      email,
      profiles,
      educationParts,
      degreeParts,
      projectsParts,
      technology,
      skills,
      experienceParts,
      additional
    };
    console.log(res);
    fs.writeFileSync(jsonRes, JSON.stringify(res));
    console.log("Done writing result json file!");
  })
  .catch(error => {
    console.error(error);
  });
