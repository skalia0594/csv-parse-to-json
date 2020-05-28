const csv = require('csvtojson');
const fs = require('fs');
const arguments = process.argv.slice(2);

// main method
const processData = async () => {
    try {
        const testsData = await getData(arguments[2]);
        const validate = (testsData!==null || typeof testsData !== "undefined") ? await validateTestsDataFile(testsData): false;
        if(!validate) return;
        // marks data
        const marksData = await getData(arguments[3]);
        const marksDataProcess = await processMarksData(marksData, testsData);
        // student data
        const [studentInfos, coursesPerStudents ] = await getStudentsAndCourses(marksDataProcess);
        // final jsonobject
        const data = await getJsonObject(studentInfos, coursesPerStudents);
        await writeData(JSON.stringify({"students":data}, null, 4));        
    } catch (error) {
        console.error(error);
    }    
}
const getData = async (filePath) => {
    return await csv().fromFile(filePath);
}
const validateTestsDataFile = async (testsData) => {
    try {
        const courseIds= {};
        for(let i=0; i< testsData.length; i++) {
            const courseId = testsData[i]["course_id"];
            if(!courseIds[courseId]) {
                courseIds[courseId] = Number(testsData[i]["weight"]);
            }
            else{
                courseIds[courseId] += Number(testsData[i]["weight"]);
                if(courseIds[courseId] > 100) throw new Error(`Sum can not be more than 100 for id = ${courseId}`);
            }
        }
        const entries = Object.entries(courseIds);
        for(const [id ,val] of entries){
            if (val !== 100) throw new Error(`The sum of all the weights of course id = ${id} should add up to 100 in test.csv file.`)
        }
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }   
}
const processMarksData = (marksData, testsData) => {
    return marksData.reduce((obj, current) => {
        const studentId = current.student_id;
        const mark = current.mark !== "" ? current.mark : 0;
        const getCourseFromTestsData = testsData.filter(test => test["id"] === current.test_id)[0];
        const courseId = getCourseFromTestsData["course_id"];
        const weight = getCourseFromTestsData["weight"];
        const weightedMark= Number((mark * (weight / 100)).toFixed(2));
        return{
            ...obj,
            [studentId] :  [...(obj[studentId]|| []), {'student_id': studentId,'course_id':courseId,'weightedMark':weightedMark} ]
        }
    }, {});
}
const getStudentsAndCourses = async (marksDataProcess) => {
    const coursesData = await getData(arguments[0]);
    const getCourseInfo = (inp) => coursesData.filter(course => course["id"] === inp)[0];  
    
    const studentsData = await getData(arguments[1]);
    const studentIds = Object.keys(marksDataProcess);
    const studentInfos = studentIds.map(id =>  studentsData.filter(student => student["id"] === id)[0]);
    const students = Object.values(marksDataProcess);
    let coursesPerStudents=[];
    for(let i=0 ; i<students.length; i++){
        let courses = [];
        students[i].reduce(function(acc, obj) {
        if (!acc[obj.course_id]) {
            const course = getCourseInfo(obj.course_id);
            acc[obj.course_id] = { 'id': Number(course.id), 'name': course.name, 'teacher':course.teacher , 'courseAverage': 0};
            courses=[...courses, acc[obj.course_id] ]
        }
        acc[obj.course_id].courseAverage = Number((acc[obj.course_id].courseAverage + obj.weightedMark).toFixed(2));
        return acc;
        }, []);
        coursesPerStudents.push(courses);
    }
    return [studentInfos, coursesPerStudents];
}
const getJsonObject = async (studentInfos, coursesPerStudents) => {
    let data = [];
    const merge = (prev, next) => Object.assign({},prev, next);
    for(let i =0; i<studentInfos.length;i++ ){
        const studentInfo = studentInfos[i];
        let totalAverage = coursesPerStudents[i].reduce((acc, obj) => (acc + obj.courseAverage),0)/coursesPerStudents[i].length;
        totalAverage = (Number(totalAverage.toFixed(2)));
        const courses = coursesPerStudents[i];
        const addObject = merge(studentInfo,{totalAverage});
        const fullObject = merge(addObject,{courses});
        data = [...data , fullObject];
    }
    return data;
} 
const writeData = async (jsonString) => {
    await fs.writeFile(arguments[4], jsonString, (err) => {
        if (err) {
            console.log('Error writing file', err)
        } else {
            console.log('Successfully wrote file')
        }
    });
}


processData();


