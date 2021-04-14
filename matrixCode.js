const mssql = require('mssql');
const mysql = require('mysql');
const config = require('./config');

const configSIS = config.configSISLive;
const configGrafana = config.configGrafana;


const sisHistoryPool = mssql.connect(configSIS);
//const grafanaMySQL = mysql.createConnection(configGrafana);
let globalDAtum;

//connection with SIS is handled as promise
sisHistoryPool  
    .then( () => mssql.query(
        `select	DATEADD(day, -1, convert(date, GETDATE())) as date,
        [Aantal]
        FROM [SIS_VIOBOX].[dbo].[v_viobox_ExportAPSData]
        where Matrix_karkas = 0 `
    ))
    .then(result =>{
        const queryDataRow = result.recordset[0];
        const datum = queryDataRow.date.toYMD();
        const aantal = queryDataRow.Aantal
        return [datum, aantal]
    })
    .then(array=>{
        const date = new Date();

        console.log(array[0] + 'data z query');
        console.log(date.toYMD() + 'data z node');
        
        if(array[0] == date.toYMD()) console.log('Equal')
        else console.log('Not equal')
        
        
        /*console.log(array)
        let a = new Date().toLocaleDateString() 
        let b = array[0]
        function convert(stringdate) {
            stringdateB = stringdate.replace(/-/g, "/");
            return b =stringdateB;
        }
        convert(b)
       // b.replace(/-/g,"/")
        console.log(`${a} this is a`)
        console.log(`${b} this is b`)
        if (b == a) {
            console.log(` is true`) 
        } else {
            console.log(` is false`)
        }*/
    })
    .then(()=> mssql.close());