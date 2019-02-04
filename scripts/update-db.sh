
echo "Removing update folder."
rm -rf update
mkdir update
echo "Fetching transaction files."
for i in {sun,mon,tue,wed,thu,fri,sat}; do
    echo "Getting data for $i"
    wget -q -a update/wget.log -O update/$i.zip http://wireless.fcc.gov/uls/data/daily/a_am_$i.zip
    mkdir update/$i
    unzip update/$i.zip EN.dat -d update/$i 
    echo "Updating db with data for $i"
    node scripts/read-huge-file.js update/$i/EN.dat
done
echo "All done!"