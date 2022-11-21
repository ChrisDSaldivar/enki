# Enki

A desktop app that allows note taking on 

## Optional Helper Script: MacOS

Copy and run the following command to download the shell script. This script can be used in lieu of running `python3` directly. It will run the python script *and* detect any error codes + log std out and std error. Then it will automatically prompt if you would like to commit your code. This way you can run your code like normal and the script will remind you to commit your code. It is recommended that you use this script since Enki can display the log files that it generates in the UI.

```sh
curl "https://enki-dist.s3.amazonaws.com/py-commit" -s -o /usr/local/bin/py-commit && chmod +x /usr/local/bin/py-commit
```

[]()



## License

Based on:
MIT © [Electron React Boilerplate](https://github.com/electron-react-boilerplate)
