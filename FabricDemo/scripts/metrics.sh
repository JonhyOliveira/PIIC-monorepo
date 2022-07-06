#
# Docker Container Log Packager
#
# Packages logs present in docker containers
#

tmpDir="/tmp"
serverName="server"
clientPrefix="client"
loggingFilePattern="/home/demo/*.log*" # logs are produced in container PWD

DEBUG=""

# Enforces the syntax: cacheMetrics <container ID> <logFile> <tmpDir>
#
# Collects log(s) in a container from the specified logFile(s).
# Logs are stored in a folder named <container ID> inside <tmpDir>
#
function cacheMetrics {

    if [ $# -ne 3 ]
    then 
        echo "Incorrect usage of $0."
        echo 
        echo -e "\tusage: $0 <containerID> <logFile> <tmpDir>"
        echo
        echo -e "\tcontainerID\t docker container ID"
        echo -e "\tlogFile\t path to file while inside docker container (passed as argument to ls)"
        echo -e "\ttmpDir\t directory where to create a dir for the logs (must exist)"
        echo
        exit 1
    else # exactly 3(+ function name) arguments
        local container_id=$1 # running container id
        local logFile=$2
        local cacheDir=$3
    fi

    echo -e "\nExtracting metrics from container $1..."

    if [ ! "$(docker ps | grep $container_id)" ]
    then # container is not currently running so take snapshot and run that
        docker commit $container_id cache/image $DEBUG
        container_id=$(docker run -d cache/image sleep 10) # run the container for the next 10 seconds. should be enough to copy all metrics files
        # echo "cache container $container_id created"
    fi

    [ ! -d $cacheDir/$1 ] && mkdir $cacheDir/$1 # create directory if needed

    for log_file in $(docker exec -it $container_id bash -c "ls $loggingFilePattern");
    do
        local f=`echo $log_file | sed 's/\r//g'`
        docker cp $container_id:$f $cacheDir/$1/
        echo "Cached file $container_id:$f"
    done

    if [ "$1" != "$container_id" ]
    then # should kill container and remove cache image
        docker stop -t 0 $container_id 
        docker rm $container_id 
        docker rmi cache/image 
    fi

    _return=$cacheDir/$1

}

function main {

    rm -f ./out.zip

    container_ids=$(docker ps -aq --filter="name=$clientPrefix*|$serverName" --format="{{.Names}}")
    folders=()

    for container_id in $container_ids; 
    do # iterate through client containers
        
        cacheMetrics $container_id $loggingFilePattern $tmpDir # cache logs
        folders+=("$_return")
    done

    echo "Packaging directories [ ${folders[@]} ] ..."

    # package everything
    zip -r ./out.zip ${folders[@]}

    echo -e "\nCleaning stuff up..."
    for container_id in $container_ids; 
    do # iterate through client containers
        
        rm -rf $tmpDir/$container_id # remove temp logs

    done

    echo -e "\nDone!"

}

main
