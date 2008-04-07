task :default => [:xpi]

task :xpi do
  rm_f 'taboo.xpi'
  `find chrome chrome.manifest components install.rdf | xargs zip taboo.xpi`
end 
