FROM rocker/tidyverse:4.3.0

# Install additional system dependencies if needed (most are already in tidyverse)
RUN apt-get update && apt-get install -y \
    libxml2-dev \
    && rm -rf /var/lib/apt/lists/*

# Install R packages
RUN R -e "install.packages(c('plumber', 'jsonlite', 'psych', 'lavaan', 'seminr', 'GPArotation', 'nortest'), repos='https://cloud.r-project.org/')"

WORKDIR /app
COPY . .

EXPOSE 8000

CMD ["R", "-e", "pr <- plumber::plumb('api.R'); pr$run(host='0.0.0.0', port=8000)"]
