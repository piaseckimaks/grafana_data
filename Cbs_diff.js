const mssql = require('mssql');
const mysql = require('mysql');
const config = require('./config');

const configSIS = config.configSISHistory;
const configGrafana = config.configGrafana;

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
        console.log(`1 ${result}`)
        console.log(`2 ${typeof result}`)
        

        const queryData = result.recordset[0];
        console.log(`3 ${queryData}`)
        const date = queryData.date.toYMD();

        const percent = queryData['Procent of good REC'];
        const diff = queryData['The difference in grams between CBS1 and CBS2'];

        grafanaMySQL.connect(err=>
            {
                if(err){ console.log(err); return;}
        
                console.log('Connected as id ' + grafanaMySQL.threadId + ' with MySQL at ' + configGrafana.host);
            })

        

        grafanaMySQL.query(
            `INSERT INTO Cbs_diff (Date, All_Rec, Percent, Diff, OK) VALUES ('${date}', ${queryData.ALL_REC}, ${percent} , ${diff} ,${queryData.ok});`, 
            err =>
            {
                if(err) throw err;

                console.log('Insert succesfully made to cbsDiff!');
            });

            //Here we close connection
            
    })
    .then( () => mssql.query(
        `
        --INSERT OPENQUERY (GRAFANA, 'SELECT date, totalDay, percent, mode, Scale FROM Grafana_Motion_Scales')
        select DATEADD(day, -1, convert(date, GETDATE())) as 'dataTime',
        COUNT(*) as 'totalDay',
        cast(count(*) * 100.0 / sum(count(*)) over (PARTITION BY Scale) as Decimal(10,2)) as 'percent', 
        mode as 'mode', 
        Scale as 'Scale'
        from [SIS_History].[dbo].[t_hist_Weight] with (nolock)
        where Scale in (22, 26, 27, 48, 49)
        and DATEDIFF(day, dtCreated, getdate()) = 1
        group by mode, Scale
        order by Scale, mode`
    ))
    .then(result =>
        {
            const queryDataRows = result.recordset;

            queryDataRows.forEach(element => {
                const date = element.dataTime.toYMD();
                const totalDay = element.totalDay;
                const percent = element.percent;
                const mode = element.mode;
                const Scale = element.Scale;

                grafanaMySQL.query(
                    `INSERT INTO Grafana_Motion_Scales (date, totalDay, percent, mode, Scale) VALUES ('${date}', ${totalDay}, ${percent} , ${mode} ,${Scale});`, 
                    err =>
                    {
                        if(err) throw err;
        
                    });
            });
            console.log('Insert succesfully made to motionScales!')
            grafanaMySQL.end();
            
        })
    .then(()=> mssql.close());







//

