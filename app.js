const csv = require('csvtojson');
const fs = require('fs');
const arguments = process.argv.slice(2);
// console.log(arguments); 

const getData = async (filePath) => {
    return await csv().fromFile(filePath);
}

const validateTestsDataFile = async () => {
    try {
        const tests = await getData(arguments[2]);
        const testArray = tests.reduce((obj, current) => {
            const courseId = current.course_id;
            return{
                ...obj,
                [courseId] :  (obj[courseId]|| 0) + Number(current.weight)
            }
        }, []);
        const entries = Object.entries(testArray);
        for(const [id ,val] of entries){
            if (val !== 100) throw new Error(`The sum of all the weights of course id = ${id} should add up to 100 in test.csv file.`)
        }
        // console.log(testArray);
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
    
}

const processData = async () => {
    try {
        const validate = await validateTestsDataFile();
        if(!validate) return;
        
        const merge = (prev, next) => Object.assign({},prev, next);


        const tests = await getData(arguments[2]);
        const getCourse = (testid) => {
            const testsArray = tests.reduce((obj, current) => {
                const testId = current.id;
                return{
                    ...obj,
                    [testId] : current.course_id
                }
            }, []);

            // console.log(testsArray);
            return testsArray[testid];
        }

        const getWeight = (testid) => {
            const testsArray = tests.reduce((obj, current) => {
                const testId = current.id;
                return{
                    ...obj,
                    [testId] : current.weight
                }
            }, []);

            // console.log(testsArray);
            return testsArray[testid];
        }
        // console.log(getWeight('1'));
        const weightedMark = (mark, weight) => {
            return (mark * (weight / 100)).toFixed(2) ; 
        }
        // console.log(weightedMark('78', getWeight('1') ));
        
        
        const marks = await getData(arguments[3]);
        
        const marksArray = marks.reduce((obj, current) => {
            const studentId = current.student_id;
            return{
                ...obj,
                [studentId] :  [...(obj[studentId]|| []), {'student_id': current.student_id,'course_id':getCourse(current.test_id),'weightedMark':weightedMark(current.mark, getWeight(current.test_id))} ]
            }
        }, {});

       
        // console.log(marksArray);

        
        const studentIds = Object.keys(marksArray);
        const studentsData = await getData(arguments[1]);
        const getstudentInfo = (inpt) => {
            let info;
            for(let i = 0; i< studentsData.length; i++){
                if (studentsData[i].id === inpt){
                    info = studentsData[i];
                    break;
                } 
            }
            return info;
        }
        const studentInfos = studentIds.map(id => {
            const info = getstudentInfo(id);
            return{
                "id":Number(info.id),
                "name":info.name
            }
        });
        // console.log(studentInfos);

        const coursesData = await getData(arguments[0]);
        const courseInfo = (inpt) => {
            let course;
            for(let i = 0; i< coursesData.length; i++){
                if (coursesData[i].id === inpt){
                    course = coursesData[i];
                    break;
                } 
            }
            return course;
        }
        // console.log(courseInfo('1'));
        const students = Object.values(marksArray);
        let coursesPerStudents=[];
        for(let i=0 ; i<students.length; i++){
            let courses = [];
            students[i].reduce(function(acc, obj) {
            if (!acc[obj.course_id]) {
                const course = courseInfo(obj.course_id);
                acc[obj.course_id] = { 'id': Number(course.id), 'name': course.name, 'teacher':course.teacher , 'courseAverage': 0};
                courses=[...courses, acc[obj.course_id] ]
            }
            acc[obj.course_id].courseAverage +=  Number(obj.weightedMark);
            return acc;
            }, []);
            // coursesPerStudents=[...coursesPerStudents, [courses]];
            coursesPerStudents.push(courses);
        }
        console.log(coursesPerStudents);
        
        let fullJsonString='{\n  "students": [\n';
        for(let i =0; i<studentInfos.length;i++ ){
            const studentInfoObject = studentInfos[i];
            let totalAverage = coursesPerStudents[i].reduce((acc, obj) => (acc + obj.courseAverage),0)/coursesPerStudents[i].length;
            totalAverage = (Number(totalAverage.toFixed(2)));
            const coursesObject = {'courses':coursesPerStudents[i]};
            const addObject = merge(studentInfoObject,{totalAverage});
            const fullObject = merge(addObject,coursesObject);
            const jsonString = JSON.stringify(fullObject,null,4);   
            fullJsonString = fullJsonString.concat(jsonString,',\n');
            
        }
        fullJsonString = fullJsonString.substring(0, fullJsonString.length-2);
        fullJsonString = fullJsonString.concat('\n]\n}');
        // console.log(fullJsonString);
        await writeData(fullJsonString);
            
    } catch (error) {
        console.error(error);
    }
    
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
