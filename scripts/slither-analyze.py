import subprocess
import os
import time
import functools

total = 0
failed = 0
vulnerable = 0
times = []
detections = 0
false_positive = 0
false_negative = 0
true_positive = 0
true_negative = 0

def timer(func):
    @functools.wraps(func)
    def wrapper_timer(*args, **kwargs):
        start_time = time.perf_counter()
        value = func(*args, **kwargs)
        end_time = time.perf_counter()
        run_time = end_time - start_time  
        print(f"Finished {func.__name__!r} in {run_time:.4f} secs")
        return value
    return wrapper_timer


@timer
def fire_analysis(file):
    try:
        subprocess.run('slither ./database/' + file)
        result = subprocess.run('slither ./database/' + file + ' --print human-summary', stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        output = result.stdout.decode().strip()
        errors = result.stderr.decode().strip()
    except subprocess.CalledProcessError as e:
        output = e.output.decode().strip()
        errors = e.stderr.decode().strip()
    return output, errors

def analyze(file):
    global total
    global times
    global vulnerable
    global detections
    global false_positive
    global true_negative
    global false_negative
    global true_positive
    global failed
    output, errors = fire_analysis(file)
    print(output, errors)
    print(file)
    if errors.find("Error: Source file requires different compiler version") != -1:
        version = errors.split("pragma solidity ")[1].split(";")[0]
        if version.find("^") != -1:
            version = version.split("^")[1]
        use_correct_solc_version(version)
        output, errors = fire_analysis(file)
        print(output, errors)
        print(file)
    # t = float(input("enter time:"))
    # total += 1
    # times.append(t)
    # is_flagged = input("is vulnerable:")
    # if is_flagged.lower() == "yes" or is_flagged.lower() == "true":
    #     vulnerable += 1
    # is_failed = input("is failed:")
    # if is_failed.lower() == "yes" or is_failed.lower() == "true":
    #     failed += 1
    # detection = int(input("how many detections: "))
    # detections += detection
    hasError = input("has error:")
    if hasError.lower() == "yes" or hasError.lower() == "true":
        hasError = True
    else:
        hasError = False
    ErrorFound = input("error found:")
    if ErrorFound.lower() == "yes" or ErrorFound.lower() == "true":
        ErrorFound = True
    else:
        ErrorFound = False
    if hasError:
        if ErrorFound:
            true_positive +=1
        else:
            false_negative +=1
    else:
        if ErrorFound:
            false_positive +=1
        else:
            true_negative += 1
        

def use_correct_solc_version(version):
    subprocess.run('solc-select install '+ version, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    subprocess.run('solc-select use '+version, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

for root, dirs, files in os.walk("./database"):
    for file in files:
        if file.endswith(".sol"):
            analyze(file)
            
# print("Total smartcontracts analyzed:", total)
# print("Flagged smartcontracts:", vulnerable)
# print("Detections per contract:", detections / total)
print("False positives:", false_positive)
print("True positives:", true_positive)
print("False negatives:", false_negative)
print("True negatives:", true_negative)
# print("Smartcontracts without vulnerabilities:",total-vulnerable)
# print("Failed analysis:", failed / total, "%")
# print("Average execution time:", sum(times) / len(times), "seconds")
# print("Minimum execution time:", min(times), "seconds")
# print("Maximum execution time:", max(times), "seconds")
                
