const { prompt }        = require('enquirer');
const cli               = require("./cli-questions")
const axios             = require("axios")
const style             = require("ansi-styles");
const config            = require ("../../config/config")
const throttledQueue    = require('throttled-queue');
const throttle          = throttledQueue(5, 1000, true);
const token             = config.token
const fs                = require("fs");
const csv               = require('csvtojson');
const csvInput          = `./logs/bulkFind/input`
const csvOutput         = `./logs/bulkFind/bulk-output.csv`;
const csvFailed         = `./logs/bulkFind/bulk-failed.csv`;

//THIS SCRIPT WILL OUTPUT TO LOGS/FIND. LOOK FOR YOUR OUTPUT FILE THERE.

const warning = () => {
    console.log(`This script will output to ${csvOutput}. Make sure to look for your output file in there`)
}

const bulk = ( answers ) => {
    prompt(cli.bulkQuestions)
    .then(answers => {
        if(answers.csv_upload_confirm) {

            // setTimeout(warning, 3000);

            fs.readdir(csvInput, (err, files) => {

                files.forEach(file => {

                let inputFilePath = `${csvInput}/${file}`

                    csv(answers)
                    .fromFile(inputFilePath)
                    .then((courses) => {
                            courses.forEach( course => {
                                
                                throttle(function() { 
                                    answers.courseNumber = course.canvas_course_id
                                    pageGet(answers)
                                })
                            })

                        })
                    })



                    })}
        else {
            console.log(`\n\nPlease place the input file in ${csvInput} and run the script again`)
            process.exit
        }
    })
}


const pageGet = (answers) => {

    let domain          = answers.domain
    let courseNumber    = answers.courseNumber
    let searchString    = answers.searchString.toLowerCase()
    let pageNumber      = 1

    //console.log(`Course number: ${courseNumber}`);
    const get = () => { 

        let headers = {
            url: `https://${domain}.instructure.com/api/v1/courses/${courseNumber}/pages?per_page=100&page=${pageNumber}`,
            headers: { Authorization: `Bearer ${token}`}
        }

        axios(headers).then(function(response){
            pages(response.data, domain, courseNumber, searchString)
            if(response.data.length ===100){
                pageNumber++
                get()
            }
        }).catch(function(error){console.log(style.color.ansi16m.hex("#EEEE66"), "pageGet ERROR: ", style.color.close)
                console.log(style.color.ansi16m.hex("#EEEE66"), error.response.data, style.color.close)})
    }
    get()
}


  const pages =(data, domain, courseNumber, searchString)=>{

    let pages = data

    pages.forEach(page=>{

        let pageId = page.url
        let pageUrl = `https://${domain}.instructure.com/api/v1/courses/${courseNumber}/pages/${pageId}`

        let headers = {
            url: `${pageUrl}`,
            headers: {Authorization: `Bearer ${token}`}
        }

        throttle(function() {
            axios(headers).then(function(response){

                console.log(`course ${courseNumber} -- checking page:  ${pageId}`)

                if(response.data.body !== null){

                    let body = response.data.body.toLowerCase()
                    let title = response.data.title
                    let url = response.data.html_url
                
                    if(body !== null){
                        let searchIndex = body.indexOf(searchString)
                        if(searchIndex !== -1){
    
                            let searchWord = new RegExp('[^\\s"]*' + searchString + '[^\\s"]*', "g");
                            let matchedWords = body.match(searchWord);
                            console.log(style.color.ansi16m.hex("#E06666"), `Found "${searchString}" at ${url}`, style.color.close)
                            var titleNoComma = title.replace(new RegExp(/,/g), "_") //get rid of the comma for the CSV
                            for (i = 0; i < matchedWords.length; i++){
                                  fs.appendFile(csvOutput, `${searchString}, ${titleNoComma}, ${url}, ${matchedWords[i]}\n`, function(err) {});
                                  console.log(style.color.ansi16m.hex("#E06666"), `${i+1}) ${matchedWords[i]}`, style.color.close)
                            }
                        }
                    }
                }

            }).catch(function(error){console.log(style.color.ansi16m.hex("#EEEE66"), `pages ERROR while scanning ${pageId} at: \n${pageUrl}`, style.color.close)
                    fs.appendFile(csvFailed, `${searchString}, ${pageId}, ${pageUrl}, pages function error\n`, function(err) {});
                    console.log(style.color.ansi16m.hex("#EEEE66"), error.response.data), style.color.close}
                    )
        })
    })
  }


  module.exports = { bulk }
