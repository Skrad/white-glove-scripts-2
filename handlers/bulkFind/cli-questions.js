module.exports = {

    bulkQuestions: [

          {
            type: 'input',
            name: 'domain',
            message: 'What is the school domain?'
           }, 

           {
            type: 'confirm',
            name: 'csv_upload_confirm',
            message: 'Did you place your csv file into "/logs/bulkFind/input"?'
           },

           {
              type: 'input',
              name: 'searchString',
              message: 'what string are you looking for?'
            }, 

    ]

}