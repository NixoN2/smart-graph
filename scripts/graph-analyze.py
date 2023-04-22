import os

f = open("report.txt", "w")

for root, dirs, files in os.walk("./database"):
    for file in files:
        if file.endswith(".sol"):
            swc = file[0:3]
            has_vulnerability = False
            stream = os.popen('node dist/index.js "src=' + root + "/" + file + '"')
            output = stream.read()
            if output.find("issue: SWC" + swc) != -1:
                has_vulnerability = True
            f.write(file+":"+str(has_vulnerability)+"\n")
            f.write(output)
            f.write("_____________________\n")

f.close()

                
