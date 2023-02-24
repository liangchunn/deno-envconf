FROM debian:bullseye
RUN apt-get update && apt-get install -y zsh git curl unzip
# install starship
RUN sh -c "$(curl -fsSL https://starship.rs/install.sh)" "" -y
RUN echo "eval \"$(starship init zsh)\"" >> ~/.zshrc
# install deno
# note that deno does not support Linux ARM64 yet
# see: https://github.com/denoland/deno/issues/1846
RUN curl -s https://gist.githubusercontent.com/LukeChannings/09d53f5c364391042186518c8598b85e/raw/ac8cd8c675b985edd4b3e16df63ffef14d1f0e24/deno_install.sh | sh
RUN echo "export DENO_INSTALL=\"/root/.deno\"" >> ~/.zshrc
RUN echo "export PATH=\"\$DENO_INSTALL/bin:\$PATH\"" >> ~/.zshrc