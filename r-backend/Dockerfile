FROM rocker/tidyverse:4.3.0

# Install additional system dependencies
RUN apt-get update && apt-get install -y \
    libxml2-dev \
    libsodium-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Plumber first as it's the most critical
RUN R -e "install.packages('plumber', repos='https://cloud.r-project.org/')"

# Install other stats packages
RUN R -e "install.packages(c('jsonlite', 'psych', 'lavaan', 'seminr', 'GPArotation', 'nortest'), repos='https://cloud.r-project.org/')"

WORKDIR /app
COPY . .

EXPOSE 8000

CMD ["R", "-e", "library(plumber); pr <- plumb('api.R'); pr$run(host='0.0.0.0', port=8000)"]
