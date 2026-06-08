from setuptools import setup

setup(
    name="liblingua",
    version="1.0.0",
    description="Official Python SDK for the liblingua platform",
    long_description=open("README.md", encoding="utf-8").read(),
    long_description_content_type="text/markdown",
    author="liblingua",
    url="https://github.com/your-org/liblingua",
    license="Apache-2.0",
    packages=["liblingua"],   # explicit — excludes the old liberiandata folder
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.28.0",
    ],
    extras_require={
        "pandas":      ["pandas>=1.3"],
        "huggingface": ["datasets>=2.0"],
        "all":         ["pandas>=1.3", "datasets>=2.0"],
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: Apache Software License",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Topic :: Text Processing :: Linguistic",
        "Intended Audience :: Science/Research",
    ],
    keywords="nlp liblingua liberia low-resource translation african-languages",
)
