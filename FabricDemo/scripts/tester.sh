#
# Boots up a server container and multiple client container to load test the server container
#

if [  $# -lt 3 ] 
then 
		echo "usage: $0 <testFolder> <testTime> <initial client count> [client creation period] [client limit]"
		exit 1
fi 

networkName="fabricDemoSocketNet"
serverName="server"
clientPrefix="client"
image="jfvoliveira2001/fabricdemo"
clientCount=$3
clientCreationPeriod=0
clientLimit=-1

if [ $4 ]
then
    clientCreationPeriod=$4
fi

if [ $5 ]
then
    clientLimit=$5
fi


function boot_client {
    docker run --network $networkName -d --name $clientPrefix-$2 $image node $1/out/client/run-test.js --canvasHost $serverName:8080
    echo "booted client $clientPrefix-$2"
    if [ ! $3 ]
    then
        clientCount=$(($clientCount + 1))
    fi
}

function boot_server {

    echo "Booting up server..."

    if [ "$(docker ps -a | grep $serverName)" ] 
    then # server exists
        echo -n "Server already exists."

        if [ "$(docker ps | grep $serverName)" ]
        then # its currently running, check what to do

            echo -e "\rServer already running. Proceed/Restart (1/0)" 
            read proceed
            if [ $proceed -le 0 ] 
            then
                echo -ne "\rRestarting server..."
                docker restart $serverName
                echo -e "\rRestarted.          "
            fi

        else # not running, but exists. see if we can start it again!
            echo -e "\rServer is stopped, but exists. Start/Rebuild (1/0)"
            read proceed
            if [ $proceed -le 0 ]
            then
                echo -e "\rRebuilding server..."
                docker rm $serverName
                docker run --network $networkName -d --name $serverName -p 8080:8080 $image node $1/out/server/run.js
                echo -e "\rRebuilt.            "
            else
                echo "Starting..."
                docker start $serverName
            fi
        fi
    else #
        echo "Rebuilding server"
        docker run --network $networkName -d --name $serverName -p 8080:8080 $image node $1/out/server/run.js
    fi
}

containers=$(docker ps -aq --filter="name=$clientPrefix*|$serverName")
if [ ${#containers[@]} -gt 0  ]
then
    echo "There are containers that match the defined server name and/or client name prefix."
    echo "Rebuild these containers? All data will be lost. yes/no (1/0)"
    read proceed
    if [ $proceed -le 0 ]
    then
        exit 1
    else
        echo "Removing containers.."
        c=0
        for container in $containers
        do
            echo -en "\r$c"
            docker stop $container -t 0 > /dev/null
            docker rm $container > /dev/null
            c=$(($c + 1))
        done
        echo "";
    fi
fi

[ ! "$(docker network ls | grep $networkName )" ] && docker network create --driver=bridge $networkName

docker pull jfvoliveira2001/fabricdemo

hours=$(($2/3600))
minutes=$((($2%3600)/60))
seconds=$((($2%3600)%60))

echo "Running load test for $2 seconds ($hours hours $minutes minutes and $seconds seconds)."
echo "Creating a client every $clientCreationPeriod miliseconds."

startTime=$(date +%s%N)
echo "Starting @ $(date)"
sleep 1.5

boot_server $1 

echo "Booting initial clients..."

# boot initial clients
c=0
for x in $(seq 0 $(($clientCount - 1))); do
    echo -en "\r$c/$clientCount "
    boot_client $1 $x 1
    c=$(($c + 1))
done
echo "";

lastCreated=$(date +%s%N)
timeToRun=$(($2 * 1000000000)) # convert seconds to nano-seconds
clientCreationPeriod=$(($clientCreationPeriod * 1000000)) # convert miliseconds to nano-seconds

echo "Load testing..."

while [ $(($(date +%s%N) - startTime)) -le $timeToRun ]
do
    # echo -ne "\rRan for $(($(date +%s) - (startTime / 1000000000))) seconds"
    if [ $clientCreationPeriod -gt 0 ] && [ $(($(date +%s%N) - lastCreated)) -gt $clientCreationPeriod ] && ([ $clientCount -le $clientLimit ] || [ $clientLimit -lt 0 ])
    then
        boot_client $1 $clientCount 
        lastCreated=$(date +%s%N)
    fi

done

# garbage collect
echo "Test is over. Stopping containers."

container_ids=$(docker ps -aq --filter="name=$clientPrefix*|$serverName")
c=0
for container_id in $container_ids
do 
    echo -en "\r$c - $container_id"
    docker stop $container_id -t 1 > /dev/null
    c=$(($c + 1))
done
echo

echo -e "\nDone!"



