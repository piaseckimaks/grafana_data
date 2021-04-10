const mssql = require('mssql');
const mysql = require('mysql');

const configSIS = 
{
    user: 'usr_MPSAdmin',
    password: 'jqH9qn8Fq',
    server: 'NLBXTMPS03P',
    database: 'SIS_History'
}

const configGrafana =
{
    host: '10.52.131.224',
    user: 'artur',
    password: 'viontd'
}

const sisHistoryPool = mssql.connect(configSIS);
const grafanaMySQL = mysql.createConnection(configGrafana);


//connection with SIS is handled as promise
sisHistoryPool
    .then( () => mssql.query(
        //Below insert your query
        `
        select cbs1.Element 
        Into #Elements 
        from t_hist_Weight cbs1 
        join t_hist_Weight cbs2 on cbs1.Element = cbs2.Element and cbs2.Scale = 49
        where cbs1.Scale = 48
        and DATEDIFF(day, cbs1.dtCreated, getdate()) = 1
        and cbs1.Mode = 3 
        and cbs2.Mode = cbs1.Mode
        group by cbs1.Element
        having (MAX(cbs1.NettoWeight)-MAX(cbs2.NettoWeight)) between -5 and 5  
            

        SELECT COUNT(distinct Element) 'count', CAST(dtCreated as date) as 'date'
        INTO #dailycounts
        FROM t_hist_Weight
        where DATEDIFF(DAY, dtCreated, GETDATE()) = 1
        and Scale in (48,49)
        group by CAST(dtCreated as date)

        --INSERT OPENQUERY (GRAFANA, 'SELECT Date, OK, All_Rec, Percent, Diff FROM Cbs_diff')
        select CAST(cbs1.dtCreated as date) as 'date',
        COUNT(cbs1.Element) as ok,
        MAX(ALL_RECORDS.count) AS ALL_REC,
        CAST(ROUND(((COUNT(cbs1.Element)*100.00)/(MAX(ALL_RECORDS.count))),2) AS decimal(10,2)) AS 'Procent of good REC',
        CAST(ROUND(avg(cbs1.NettoWeight-cbs2.NettoWeight),2) AS decimal(10,2)) as 'The difference in grams between CBS1 and CBS2'
        from t_hist_Weight as cbs1
        join t_hist_Weight as cbs2 on cbs1.Element = cbs2.Element and cbs2.Scale = 49
        join #dailycounts AS ALL_RECORDS ON CAST(cbs1.dtCreated as date) = ALL_RECORDS.[date]
        where cbs1.Scale = 48
        and cbs1.Element in (select Element from #Elements)
        group by CAST(cbs1.dtCreated as date)

        DROP TABLE #Elements
        DROP TABLE #dailycounts
        --END
        `
    ))
    .then(result =>
    {
        const queryData = result.recordset[0];

        const date = queryData.date.toYMD();

        const percent = queryData['Procent of good REC'];
        const diff = queryData['The difference in grams between CBS1 and CBS2'];

        grafanaMySQL.connect(err=>
            {
                if(err){ console.log(err); return;}
        
                console.log('Connected as id ' + grafanaMySQL.threadId + ' with MySQL at ' + configGrafana.host);
            })

        

        grafanaMySQL.query(
            `INSERT INTO vion_kpi.Cbs_diff (Date, All_Rec, Percent, Diff, OK) VALUES ('${date}', ${queryData.ALL_REC}, ${percent} , ${diff} ,${queryData.ok});`, 
            err =>
            {
                if(err) throw err;

                console.log('Insert succesfully made!');
            });

            //Here we close connection
            grafanaMySQL.end();
    })
    .then(()=> mssql.close());









