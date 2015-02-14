
{
    "targets": [
        {
            "target_name": "cuda",
            "sources": [
                "src-cpp/bindings.cpp",
                "src-cpp/ctx.cpp",
                "src-cpp/device.cpp",
                "src-cpp/function.cpp",
                "src-cpp/mem.cpp",
                "src-cpp/module.cpp"
            ],
            'conditions': [
                [ 'OS=="mac"', {
                    'libraries': ['-framework CUDA'],
                    'include_dirs': ['/usr/local/include'],
                    'library_dirs': ['/usr/local/lib']
                }],
                [ 'OS=="linux"', {
                    'libraries': ['-lcuda'],
                    'include_dirs': ['/usr/local/include'],
                    'library_dirs': ['/usr/local/lib']
                }],
                [ 'OS=="win"', {
                    'conditions': [
                        ['target_arch=="x64"',
                            {
                            'variables': { 'arch': 'x64' }
                            }, {
                            'variables': { 'arch': 'Win32' }
                            }
                        ],
                    ],
                    'variables': {
                        'cuda_root%': '$(CUDA_PATH)'
                        },
                        'libraries': [
                        '-l<(cuda_root)/lib/<(arch)/cuda.lib',
                        ],
                        "include_dirs": [
                        "<(cuda_root)/include",
                        ],
                    }, 
                    {
                        "include_dirs": [
                        "/usr/local/cuda-6.0/include",
                        "/usr/local/cuda/include"
                        ],
                    }
                ]
            ]
        }
    ]
}
