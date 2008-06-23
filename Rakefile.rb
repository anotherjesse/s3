task :default => [:xpi]

task :xpi do
  rm_f 's3.xpi'
  `find chrome chrome.manifest components install.rdf | egrep -v "(~|#)" | xargs zip s3.xpi`
end 
