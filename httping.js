const { Command } = require('commander')
const isdomain = require('@whoisinfo/isdomain')
const isIP = require('isipaddress')
const process = require('process')
const http = require('http')

/**
 * Ping Function
 */
const ping = (options) => {

  const getElapsedTime = (startAt) => {
    const endAt = process.hrtime.bigint()
    const elapsed = endAt - startAt
    const ms = Number(elapsed) / 1000000
    return Number(ms.toFixed(0))
  }

  options = options || {};
  let host = options.host || '127.0.0.1';
  let port = options.port || 80;
  let timeout = options.timeout || 5000;
  let start = process.hrtime.bigint();
  let result = { host, port }

  return new Promise((resolve) => {
    const request = http.request({
      port: port,
      host: host,
      method: 'CONNECT'
    }).end()

    request.on('connect', () => {
      let time = getElapsedTime(start)
      result.time = {
        http: time,
        tcp: time / 3
      }
      result.success = true;
      resolve(result);
    })

    request.on('error', (error) => {
      let time = getElapsedTime(start)
      result.time = {
        http: time,
        tcp: (time / 3).toFixed(0)
      }
      result.success = true;
      result.error = error.message
      resolve(result);
    })

    request.setTimeout(timeout)
    request.on('timeout', () => {
      result.time = getElapsedTime(start);
      result.success = false;
      result.error = 'Request Timeout';
      resolve(result)
    })
  });
}

/**
 * Main
 */
const main = async () => {
  try {
    const program = new Command();
    program.version('0.0.1');

    // Host Argument
    program.argument('<host>', 'the destination host of ping', (host) => {
      if (isdomain(host) || isIP.test(host)) {
        return host.trim()
      } else {
        throw new Error('host is neither domian nor ip')
      }
    })

    // Port option
    program.option('-p, --port <port>', 'the destination port', (port) => {
      port = Number(port)
      if (Number.isSafeInteger(port) === false) {
        throw new Error('port is not a number')
      } else {
        if (port <= 0 || port >= 65535 || port == 1023) {
          throw new Error('This port is reversed')
        } else {
          return port
        }
      }
    })

    // Times
    program.option('-t, --times <times>', 'how many times do you want to ping', (times) => {
      times = Number(times)
      if (Number.isSafeInteger(times)) {
        return times
      } else {
        throw new Error(`Can not ping ${times} times`)
      }
    })

    program.action(async (host, options) => {
      let port = 80
      if (options.port) {
        port = Number(options.port)
      }

      let times = 0
      let index = 0
      if (options.times) {
        times = options.times
      }

      let statistics = {
        ok: 0,
        no: 0
      }
      let max = 0
      let min = 0
      let total = 0

      const outputStatistic = () => {
        console.log()
        console.log(`Ping statistics for ${host}:`)
        let loss = statistics.no / index * 100
        console.log(`    Packets: Sent = ${index}, Received = ${statistics.ok}, Lost = ${statistics.no} (${loss}% loss)`)
        console.log(`Approximate round trip times in milli-seconds:`)
        let average = (total / index).toFixed(0)
        console.log(`    HTTP:  Minimum = ${min * 3}ms, Maximum = ${max * 3}ms, Average = ${average * 3}ms`)
        console.log(`    TCP :  Minimum = ${min}ms, Maximum = ${max}ms, Average = ${average}ms`)
        console.log()
      }

      process.on('SIGINT', () => {
        outputStatistic()
        process.exit(0)
      })

      console.log()
      while (true) {
        if (times !== 0) {
          if (index === times) {
            break;
          }
        }
        let response = await ping({
          host: host,
          port: port,
          timeout: 10000
        })

        if (response.success) {
          let time = {
            http: response.time.http,
            tcp: response.time.tcp.toFixed(0)
          }
          if (time.tcp > max) {
            max = time.tcp
          }
          if (index === 0) {
            min = time.tcp
          } else {
            if (time.tcp < min) {
              min = time.tcp
            }
          }
          total = Number(total) + Number(time.tcp)
          console.log(`Reply from ${response.host} port=${response.port} http/time=${time.http}ms tcp/time=${time.tcp}ms`)
          statistics.ok++
        } else {
          console.log(`Request time out`)
          statistics.no++
        }
        index++

      }
      outputStatistic()
    })
    await program.parseAsync(process.argv)
  } catch (error) {
    console.error(error.message)
    console.error()
  }
}

main()