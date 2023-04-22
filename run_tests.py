import os
import re 
import time

errors = 0
total = 0
no_errors = 0
found_vulnerabilities = 0
flagged = 0
times = []

for root, dirs, files in os.walk("./database"):
    for file in files:
        if file.endswith(".sol"):
            total += 1
            start = time.time()
            stream = os.popen('node dist/index.js "src=' + root + "/" + file + '"')
            output = stream.read()
            end = time.time()
            times.append(end - start)
            if output.find("Issues not found in") != -1:
                no_errors += 1
            if output.find("issues found in") != -1:
                flagged += 1
                result = re.findall(r'There are \d+ issues found in', output)
                result = result[0].split(" ")[2]
                found_vulnerabilities += int(result)
                
errors = total - no_errors - flagged

print("Total smartcontracts analyzed:", total)
print("Flagged smartcontracts:", flagged)
print("Detections per contract:", found_vulnerabilities / total)
print("Smartcontracts without vulnerabilities:", no_errors)
print("Failed analysis:", errors / total, "%")
print("Average execution time:", sum(times) / len(times), "seconds")
print("Minimum execution time:", min(times), "seconds")
print("Maximum execution time:", max(times), "seconds")