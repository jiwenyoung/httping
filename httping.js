const { Command } = require('commander')
const isdomain = require('@whoisinfo/isdomain')
const isip = require('isip')
const process = require('process')
const net = require('net')
const axios = require('axios')

/**
 * Ping Function
 */
const getElapsedTime = (startAt) => {
  const endAt = process.hrtime.bigint()
  const elapsed = endAt - startAt
  const ms = Number(elapsed) / 1000000
  return ms.toFixed(0)
}

const ping = (options) => {
  options = options || {};
  const host = options.host || '127.0.0.1';
  const port = options.port || 80;
  const timeout = options.timeout || 5000;
  const start = process.hrtime.bigint();
  const result = { host, port }
  
  return new Promise((resolve) => {
      axios.head(`http://${host}`).then((data)=>{
        result.time = getElapsedTime(start);
        result.success = true;
        resolve(result);
      }).catch((error)=>{
        result.time = getElapsedTime(start);
        result.success = true;
        resolve(result);
      })
      //const socket = new net.Socket();
      //socket.on('connect', ()=>{
      //  result.time = getElapsedTime(start);
      //  result.success = true;
      //  resolve(result);
      //  socket.destroy();
      //})
      //socket.on('error', (e) => {
      //    result.time = getElapsedTime(start);
      //    result.success = false;
      //    result.error = e.message;
      //    socket.destroy();
      //    resolve(result);
      //});
      //socket.setTimeout(timeout, () => {
      //    result.time = getElapsedTime(start);
      //    result.success = false;
      //    result.error = 'Request Timeout';
      //    socket.destroy();
      //    resolve(result);
      //  });
      //socket.connect(parseInt(port), host);
  });
}

/**
 * Main
 */
const main = async () => {
  try{
    const program = new Command();
    program.version('0.0.1');

    // Host Argument
    program.argument('<host>', 'the destination host of ping', (host)=>{
      if( isdomain(host) || isip(host) ){
        return host.trim()
      }else{
        throw new Error('host is neither domian nor ip')
      }
    })

    // Port option
    program.option('-p, --port <port>', 'the destination port', (port)=>{
      port = Number(port)
      if(Number.isSafeInteger(port) === false){
        throw new Error('port is not a number')
      }else{
        if(port <= 0 || port >= 65535 || port == 1023){
          throw new Error('This port is reversed')
        }else{
          return port
        }
      }
    })

    // Times
    program.option('-t, --times <times>', 'how many times do you want to ping', (times)=>{
      times = Number(times)
      if(Number.isSafeInteger(times)){
        return times
      }else{
        throw new Error(`Can not ping ${times} times`)
      }
    })

    program.action(async(host, options) => {
      let port = 80
      if(options.port){
        port = Number(options.port)
      }

      let times = 0
      let index = 0
      if(options.times){
        times = options.times
      }

      let statistics = {
        ok: 0,
        no: 0
      }
      let max = 0
      let min = 0
      let total = 0

      const outputStatistic = () =>{
        console.log()
        console.log(`Ping statistics for ${host}:`)
        let loss = statistics.no / index * 100
        console.log(`    Packets: Sent = ${index}, Received = ${statistics.ok}, Lost = ${statistics.no} (${loss}% loss)`)
        console.log(`Approximate round trip times in milli-seconds:`)
        let average = Math.floor(total / index)
        console.log(`    Minimum = ${min}ms, Maximum = ${max}ms, Average = ${average}ms`)
        console.log()
      }

      process.on('SIGINT',()=>{
        outputStatistic()
        process.exit(0)
      })
      
      console.log()
      while(true){
        if(times !== 0){
          if(index === times){
            break;
          }
        }
        let response = await ping({
          host: host, 
          port: port, 
          timeout: 10000
        })
        if(response.success){
          let time = Math.floor(Number(response.time))
          if(time > max){
            max = time
          }
          if(index === 0){
            min = time
          }else{
            if(time < min){
              min = time
            }
          }
          total = total + time
          console.log(`Reply from ${response.host} port=${response.port} time=${time}ms`)
          statistics.ok++
        }else{
          console.log(`Request time out`)
          statistics.no++
        }
        index++ 

        // Sleep for 100ms
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      outputStatistic()
    })
    await program.parseAsync(process.argv)
  }catch(error){
    console.dir(error)
    console.error(error.message)
    console.error()
  }
}

main()